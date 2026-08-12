import json

import pytest

from conftest import Address, FakeNondet, FakeRoot, FakeWeb, MESSAGE


def register(
    ledger,
    *,
    period="202312",
    template="PROGRAM_SERVICE_SHARE",
    bps=7000,
    intent=None,
):
    return ledger.register_claim(
        "123456789",
        period,
        "202441239349300001",
        template,
        "The charity spent 70% on program services.",
        bps,
        intent or f"intent-{period}-1234567890",
    )


def result_json(*, numerator=700, denominator=1000, verdict="SUPPORTED_BY_FILING"):
    return json.dumps(
        {
            "verdict": verdict,
            "source_ein": "123456789",
            "source_tax_period": "202312",
            "source_object_id": "202441239349300001",
            "numerator": numerator,
            "denominator": denominator,
            "calculated_bps": 9999,
            "explanation": "This text is intentionally not trusted.",
        }
    )


def test_register_freezes_identifiers_and_constructs_evidence_urls(ledger):
    claim_id = register(ledger)
    claim = ledger.get_claim(claim_id)

    assert claim["state"] == "FROZEN"
    assert claim["registrant"] == "0x1111111111111111111111111111111111111111"
    assert claim["filing_url"] == (
        "https://projects.propublica.org/nonprofits/full_text/"
        "202441239349300001/IRS990"
    )
    assert claim["crosscheck_url"].endswith("/organizations/123456789.json")
    assert ledger.get_claim_id_by_intent(claim["registrant"], "intent-202312-1234567890") == claim_id


def test_deployer_is_registered_as_upgrader(ledger):
    assert MESSAGE.sender_address in FakeRoot.state.upgrader_values


def test_authorized_upgrader_can_replace_code(ledger):
    ledger.upgrade(b"v2-source")
    assert FakeRoot.state.code_value.value == b"v2-source"


def test_unauthorized_address_cannot_replace_code(ledger):
    MESSAGE.sender_address = Address("0x2222222222222222222222222222222222222222")
    with pytest.raises(RuntimeError, match="locked code slot"):
        ledger.upgrade(b"unauthorized")
    assert FakeRoot.state.code_value.value == b"v1"


@pytest.mark.parametrize(
    ("claimed", "numerator", "denominator", "expected"),
    [
        (7000, 700, 1000, "SUPPORTED_BY_FILING"),
        (7050, 700, 1000, "SUPPORTED_BY_FILING"),
        (7051, 700, 1000, "QUALIFICATION_REQUIRED"),
        (7300, 700, 1000, "QUALIFICATION_REQUIRED"),
        (7301, 700, 1000, "OVERSTATED"),
        (6600, 700, 1000, "QUALIFICATION_REQUIRED"),
        (5000, 0, 0, "NOT_COMPARABLE"),
        (5000, 1100, 1000, "NOT_COMPARABLE"),
    ],
)
def test_numeric_verdict_boundaries(ledger, claimed, numerator, denominator, expected):
    assert ledger._numeric_verdict(numerator, denominator, claimed) == expected


@pytest.mark.parametrize(
    ("ein", "period", "object_id", "message"),
    [
        ("123", "202312", "202441239349300001", "EIN"),
        ("123456789", "202313", "202441239349300001", "Tax period"),
        ("123456789", "202312", "not-digits", "Object ID"),
    ],
)
def test_registration_rejects_malformed_filing_identity(
    ledger, ein, period, object_id, message
):
    with pytest.raises(Exception, match=message):
        ledger.register_claim(
            ein,
            period,
            object_id,
            "PROGRAM_SERVICE_SHARE",
            "The charity spent 70% on program services.",
            7000,
            "intent-1234567890abcdef",
        )


def test_registration_rejects_replayed_client_intent(ledger):
    replayed = "intent-replayed-1234567890"
    register(ledger, intent=replayed)
    with pytest.raises(Exception, match="already used"):
        register(ledger, period="202212", intent=replayed)


def test_assessment_uses_rederived_numeric_facts_not_llm_verdict_or_math(ledger):
    claim_id = register(ledger)

    ledger.assess_claim(claim_id)
    claim = ledger.get_claim(claim_id)

    assert claim["state"] == "ASSESSED"
    assert claim["verdict"] == "SUPPORTED_BY_FILING"
    assert claim["calculated_bps"] == 7000
    assert "matches the bound filing" in claim["explanation"]


@pytest.mark.parametrize("bad_number", [2**256, -1, True, "7"])
def test_untrusted_numbers_outside_strict_u256_become_unresolved(ledger, bad_number):
    claim_id = register(ledger, template="NAMED_PROGRAM_SCOPE", bps=0)
    payload = result_json(numerator=bad_number, denominator=1000)
    FakeNondet.llm_results = [payload, payload]

    ledger.assess_claim(claim_id)

    claim = ledger.get_claim(claim_id)
    assert claim["state"] == "UNRESOLVED"
    assert claim["verdict"] == "UNRESOLVED"


def test_named_program_scope_canonicalizes_unused_numbers_to_zero(ledger):
    claim_id = register(ledger, template="NAMED_PROGRAM_SCOPE", bps=0)
    payload = result_json(numerator=700, denominator=1000)
    FakeNondet.llm_results = [payload, payload]

    ledger.assess_claim(claim_id)

    claim = ledger.get_claim(claim_id)
    assert claim["state"] == "ASSESSED"
    assert claim["numerator"] == 0
    assert claim["denominator"] == 0
    assert claim["calculated_bps"] == 0


def test_validator_disagreement_leaves_frozen_state_unchanged(ledger):
    claim_id = register(ledger, template="NAMED_PROGRAM_SCOPE", bps=0)
    FakeNondet.llm_results = [
        result_json(numerator=700, denominator=1000),
        result_json(numerator=800, denominator=1000, verdict="OVERSTATED"),
    ]

    with pytest.raises(RuntimeError, match="Validator disagreed"):
        ledger.assess_claim(claim_id)

    assert ledger.get_claim(claim_id)["state"] == "FROZEN"


def test_missing_part_ix_values_becomes_unresolved(ledger):
    claim_id = register(ledger)
    FakeWeb.filing_body = b'''<span id="/AppData/SubmissionHeaderAndDocument/ReturnHeader[1]/Filer[1]/EIN[1]">12-3456789</span>
<span id="/AppData/SubmissionHeaderAndDocument/ReturnHeader[1]/TaxPeriodEndDt[1]">12-31-2023</span>'''

    ledger.assess_claim(claim_id)

    assert ledger.get_claim(claim_id)["state"] == "UNRESOLVED"


def test_filing_identity_mismatch_is_adverse_not_unresolved(ledger):
    claim_id = register(ledger)
    FakeWeb.filing_body = FakeWeb.filing_body.replace(b"12-3456789", b"98-7654321")

    ledger.assess_claim(claim_id)

    claim = ledger.get_claim(claim_id)
    assert claim["state"] == "ASSESSED"
    assert claim["verdict"] == "WRONG_PERIOD_OR_ENTITY"


def test_malformed_filing_identity_fails_unresolved(ledger):
    claim_id = register(ledger)
    FakeWeb.filing_body = FakeWeb.filing_body.replace(b"12-3456789", b"missing")

    ledger.assess_claim(claim_id)

    assert ledger.get_claim(claim_id)["state"] == "UNRESOLVED"


def test_rate_limit_becomes_unresolved_and_retry_is_bounded(ledger):
    claim_id = register(ledger)
    FakeWeb.response_status = 429

    ledger.assess_claim(claim_id)
    assert ledger.get_claim(claim_id)["state"] == "UNRESOLVED"

    ledger.retry_assessment(claim_id, "retry-intent-one-123456")
    ledger.retry_assessment(claim_id, "retry-intent-two-123456")
    with pytest.raises(Exception, match="Retry limit"):
        ledger.retry_assessment(claim_id, "retry-intent-three-1234")


def test_retry_replay_with_same_intent_is_idempotent(ledger):
    claim_id = register(ledger)
    FakeWeb.response_status = 429
    ledger.assess_claim(claim_id)

    ledger.retry_assessment(claim_id, "retry-idempotent-123456")
    ledger.retry_assessment(claim_id, "retry-idempotent-123456")

    assert ledger.get_claim(claim_id)["retries"] == 1


def test_successor_requires_same_ein_template_and_newer_assessed_period(ledger):
    old_id = register(ledger, period="202212")
    new_id = register(ledger, period="202312")
    for claim_id in (old_id, new_id):
        ledger.claims[claim_id].state = "ASSESSED"

    ledger.link_successor(old_id, new_id)

    old = ledger.get_claim(old_id)
    assert old["state"] == "SUPERSEDED"
    assert old["successor_id"] == new_id


def test_only_original_registrant_can_link_successor(ledger):
    old_id = register(ledger, period="202212")
    new_id = register(ledger, period="202312")
    for claim_id in (old_id, new_id):
        ledger.claims[claim_id].state = "ASSESSED"

    MESSAGE.sender_address = Address("0x2222222222222222222222222222222222222222")
    with pytest.raises(Exception, match="original registrant"):
        ledger.link_successor(old_id, new_id)

    assert ledger.get_claim(old_id)["state"] == "ASSESSED"
