from typing import Dict, Type
from backend.app.services.actions.base import BaseAction, ActionResult
from backend.app.services.actions.http_action import HttpRequestAction
from backend.app.services.actions.transform_action import JsonTransformAction
from backend.app.services.actions.condition_action import ConditionAction

ACTION_REGISTRY: Dict[str, Type[BaseAction]] = {
    "http_request": HttpRequestAction,
    "json_transform": JsonTransformAction,
    "condition": ConditionAction,
}

__all__ = [
    "BaseAction",
    "ActionResult",
    "HttpRequestAction",
    "JsonTransformAction",
    "ConditionAction",
    "ACTION_REGISTRY",
]
