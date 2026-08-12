import importlib.util
import sys
import types
from pathlib import Path

import pytest


class Address:
    def __init__(self, value="0x1111111111111111111111111111111111111111"):
        self.as_hex = value

    def __eq__(self, other):
        return isinstance(other, Address) and self.as_hex == other.as_hex

    def __hash__(self):
        return hash(self.as_hex)


class TreeMap(dict):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls

    def get_or_insert_default(self, key):
        if key not in self:
            self[key] = TreeMap()
        return self[key]


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


class UserError(Exception):
    pass


class Public:
    @staticmethod
    def write(fn):
        return fn

    @staticmethod
    def view(fn):
        return fn


MESSAGE = types.SimpleNamespace(sender_address=Address())


class FakeCode:
    def __init__(self, root_state):
        self.root_state = root_state
        self.value = b"v1"

    def _require_upgrader(self):
        if MESSAGE.sender_address not in self.root_state.upgrader_values:
            raise RuntimeError("sender cannot modify locked code slot")

    def truncate(self):
        self._require_upgrader()
        self.value = b""

    def extend(self, new_code):
        self._require_upgrader()
        self.value += new_code


class FakeCell:
    def __init__(self, value):
        self.value = value

    def get(self):
        return self.value


class FakeRootState:
    def __init__(self):
        self.upgrader_values = []
        self.code_value = FakeCode(self)
        self.upgraders = FakeCell(self.upgrader_values)
        self.code = FakeCell(self.code_value)


class FakeRoot:
    state = FakeRootState()

    @classmethod
    def reset(cls):
        cls.state = FakeRootState()

    @classmethod
    def get(cls):
        return cls.state


class FakeWeb:
    response_status = 200
    response_body = b'{"organization":{"ein":"123456789"}}'
    rendered_text = "Form 990 filing text"

    @classmethod
    def request(cls, _url, method="GET"):
        return types.SimpleNamespace(status_code=cls.response_status, body=cls.response_body)

    @classmethod
    def render(cls, _url, mode="text"):
        return cls.rendered_text


class FakeNondet:
    web = FakeWeb
    llm_results = []

    @classmethod
    def exec_prompt(cls, _prompt):
        if not cls.llm_results:
            raise RuntimeError("No mocked LLM result")
        return cls.llm_results.pop(0)


class VM:
    Result = object
    Return = Return
    UserError = UserError

    @staticmethod
    def run_nondet_unsafe(leader_fn, validator_fn):
        proposed = leader_fn()
        if not validator_fn(Return(proposed)):
            raise RuntimeError("Validator disagreed")
        return proposed


def _identity(value):
    return value


@pytest.fixture(scope="session")
def contract_module():
    fake = types.ModuleType("genlayer")
    fake.gl = types.SimpleNamespace(
        Contract=object,
        public=Public,
        message=MESSAGE,
        vm=VM,
        nondet=FakeNondet,
        storage=types.SimpleNamespace(Root=FakeRoot),
    )
    fake.allow_storage = _identity
    fake.Address = Address
    fake.TreeMap = TreeMap
    fake.u256 = int
    sys.modules["genlayer"] = fake

    source = Path(__file__).parents[1] / "contracts" / "charity_claim_ledger.py"
    spec = importlib.util.spec_from_file_location("charity_claim_ledger", source)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def ledger(contract_module):
    MESSAGE.sender_address = Address()
    FakeRoot.reset()
    contract = contract_module.CharityProgramClaimLedger()
    contract.claims = TreeMap()
    contract.claim_ids_by_intent = TreeMap()
    contract.retry_claim_ids_by_intent = TreeMap()
    FakeWeb.response_status = 200
    FakeWeb.response_body = b'{"organization":{"ein":"123456789"}}'
    FakeWeb.rendered_text = "Form 990 filing text"
    FakeNondet.llm_results = []
    return contract
