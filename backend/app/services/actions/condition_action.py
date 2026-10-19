from typing import Any, Dict
from backend.app.services.actions.base import BaseAction, ActionResult
from backend.app.services.actions.transform_action import resolve_path


class ConditionAction(BaseAction):
    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        left_operand_expr = config.get("left_operand", "")
        operator = config.get("operator", "equals")
        right_operand = config.get("right_operand")

        # Resolve left operand from context if it looks like a path
        left_value = resolve_path(context, left_operand_expr)

        # If left operand wasn't found in context, check if it's a literal or fallback
        if left_value is None and not left_operand_expr.startswith(("steps.", "input.")):
            left_value = left_operand_expr

        # Resolve right operand if it's a path expression (e.g. starts with $)
        if isinstance(right_operand, str) and right_operand.startswith("$"):
            right_operand = resolve_path(context, right_operand[1:])

        condition_met = False
        error_msg = None

        try:
            if operator == "equals":
                condition_met = (left_value == right_operand)
            elif operator == "not_equals":
                condition_met = (left_value != right_operand)
            elif operator == "greater_than":
                if left_value is None or right_operand is None:
                    condition_met = False
                else:
                    condition_met = float(left_value) > float(right_operand)
            elif operator == "less_than":
                if left_value is None or right_operand is None:
                    condition_met = False
                else:
                    condition_met = float(left_value) < float(right_operand)
            elif operator == "contains":
                if left_value is None:
                    condition_met = False
                elif isinstance(left_value, (list, tuple, str)):
                    condition_met = right_operand in left_value
                elif isinstance(left_value, dict):
                    condition_met = right_operand in left_value
                else:
                    condition_met = False
            elif operator == "exists":
                condition_met = (left_value is not None)
            elif operator == "not_exists":
                condition_met = (left_value is None)
            else:
                return ActionResult(
                    success=False,
                    output={},
                    error=f"Unsupported condition operator '{operator}'",
                    retryable=False
                )
        except (ValueError, TypeError) as err:
            error_msg = f"Comparison failed with type error: {err}"
            return ActionResult(
                success=False,
                output={
                    "left_operand": left_operand_expr,
                    "left_value": str(left_value),
                    "operator": operator,
                    "right_operand": right_operand,
                    "condition_met": False,
                },
                error=error_msg,
                retryable=False
            )

        # When condition is not met, mark subsequent steps to be skipped
        should_skip = not condition_met

        return ActionResult(
            success=True,
            output={
                "left_operand": left_operand_expr,
                "left_value": left_value,
                "operator": operator,
                "right_operand": right_operand,
                "condition_met": condition_met,
                "subsequent_action": "continue" if condition_met else "skip",
            },
            error=None,
            should_skip_subsequent=should_skip,
            retryable=False
        )
