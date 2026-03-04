import json

import pytest

from rivu_server_sdk import (
    UiV1CapabilitiesValueV1,
    choose_compatible,
    choose_viewer_chart_component_v1,
    decode_ui_v1_capabilities_with_limits_v1,
    is_supported,
)
from rivu_server_sdk.limits import LimitExceededError


def test_helpers_is_supported_choose_compatible() -> None:
    capabilities = UiV1CapabilitiesValueV1.model_validate(
        {
            "v": 1,
            "components": {
                "MetricCard": {"minSchemaVersion": 1, "maxSchemaVersion": 2},
                "BarChart": {"minSchemaVersion": 1, "maxSchemaVersion": 1},
            },
        }
    )

    assert is_supported(capabilities=capabilities, component_type="MetricCard", schema_version=1) is True
    assert is_supported(capabilities=capabilities, component_type="MetricCard", schema_version=2) is True
    assert is_supported(capabilities=capabilities, component_type="MetricCard", schema_version=3) is False

    assert choose_compatible(capabilities=capabilities, candidates=[("MetricCard", 1), ("MetricCard", 2)]) == ("MetricCard", 2)
    assert choose_compatible(capabilities=capabilities, candidates=[("Chart", 1), ("BarChart", 1)]) == ("BarChart", 1)


def test_helper_choose_viewer_chart_component_v1() -> None:
    capabilities = UiV1CapabilitiesValueV1.model_validate(
        {
            "v": 1,
            "components": {
                "Chart": {"minSchemaVersion": 1, "maxSchemaVersion": 1},
                "BarChart": {"minSchemaVersion": 1, "maxSchemaVersion": 1},
                "LineChart": {"minSchemaVersion": 1, "maxSchemaVersion": 1},
            },
            "features": {"chart": {"marks": ["bar", "pie"], "interactions": []}},
        }
    )

    assert choose_viewer_chart_component_v1(capabilities=capabilities, mark="bar") == ("Chart", 1)
    assert choose_viewer_chart_component_v1(capabilities=capabilities, mark="line") == ("LineChart", 1)


def test_decode_ui_v1_capabilities_with_limits_v1() -> None:
    payload = {
        "type": "CUSTOM",
        "name": "ui.v1.capabilities",
        "value": {"v": 1, "components": {"MetricCard": {"minSchemaVersion": 1, "maxSchemaVersion": 1}}},
    }
    raw = json.dumps(payload)

    event = decode_ui_v1_capabilities_with_limits_v1(raw, limits={"decode": {"maxBytes": 10_000, "maxDepth": 32, "maxStringLength": 10_000}})
    assert event.name == "ui.v1.capabilities"
    assert event.value.v == 1

    with pytest.raises(LimitExceededError):
        decode_ui_v1_capabilities_with_limits_v1(raw, limits={"decode": {"maxBytes": 10, "maxDepth": 32, "maxStringLength": 10_000}})

