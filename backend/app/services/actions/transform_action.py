import json
from typing import Any, Dict, Optional
from backend.app.services.actions.base import BaseAction, ActionResult


def resolve_path(data: Any, path: str) -> Any:
    """
    Safely resolves a dot-delimited path (e.g. 'steps.step1.output.id' or 'input.data.user')
    within nested dicts/lists without code evaluation.
    """
    if not path or not path.strip():
        return data

    parts = path.strip().split(".")
    curr = data
    for part in parts:
        if curr is None:
            return None
        # Handle dictionary key
        if isinstance(curr, dict):
            curr = curr.get(part)
        # Handle list indexing like items.0
        elif isinstance(curr, (list, tuple)):
            if part.isdigit():
                idx = int(part)
                if 0 <= idx < len(curr):
                    curr = curr[idx]
                else:
                    return None
            else:
                return None
        else:
            return None
    return curr


def resolve_template_value(val: Any, context: Dict[str, Any]) -> Any:
    """Recursively resolves template values in construct_object."""
    if isinstance(val, str):
        # Syntax $path, {{path}}, or direct path (input.* / steps.*)
        trimmed = val.strip()
        if trimmed.startswith("$"):
            return resolve_path(context, trimmed[1:])
        elif trimmed.startswith("{{") and trimmed.endswith("}}"):
            return resolve_path(context, trimmed[2:-2].strip())
        elif trimmed.startswith("input.") or trimmed.startswith("steps."):
            return resolve_path(context, trimmed)
        return val
    elif isinstance(val, dict):
        return {k: resolve_template_value(v, context) for k, v in val.items()}
    elif isinstance(val, list):
        return [resolve_template_value(item, context) for item in val]
    return val


class JsonTransformAction(BaseAction):
    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        operation = config.get("operation", "select_path")

        try:
            if operation == "select_path":
                path = config.get("path")
                if not path:
                    return ActionResult(
                        success=False,
                        output={},
                        error="Missing required 'path' parameter for select_path operation",
                        retryable=False
                    )
                extracted = resolve_path(context, path)
                return ActionResult(
                    success=True,
                    output={"result": extracted, "path": path}
                )

            elif operation == "rename_keys":
                path = config.get("path")
                source = resolve_path(context, path) if path else context.get("input", {})
                if not isinstance(source, dict):
                    return ActionResult(
                        success=False,
                        output={},
                        error=f"Source data for rename_keys must be a dict, got {type(source).__name__}",
                        retryable=False
                    )

                mappings = config.get("mappings", {})
                if not isinstance(mappings, dict):
                    return ActionResult(
                        success=False,
                        output={},
                        error="'mappings' parameter must be a dict of {old_key: new_key}",
                        retryable=False
                    )

                result = {}
                for k, v in source.items():
                    new_key = mappings.get(k, k)
                    result[new_key] = v

                return ActionResult(
                    success=True,
                    output={"result": result}
                )

            elif operation == "construct_object":
                template = config.get("template", {})
                if not isinstance(template, dict):
                    return ActionResult(
                        success=False,
                        output={},
                        error="'template' parameter must be a JSON object",
                        retryable=False
                    )

                constructed = resolve_template_value(template, context)
                return ActionResult(
                    success=True,
                    output={"result": constructed}
                )

            elif operation == "type_convert":
                path = config.get("path")
                target_type = config.get("target_type")
                if not path or not target_type:
                    return ActionResult(
                        success=False,
                        output={},
                        error="Both 'path' and 'target_type' are required for type_convert",
                        retryable=False
                    )

                val = resolve_path(context, path)
                if val is None:
                    return ActionResult(
                        success=False,
                        output={"result": None},
                        error=f"Value at path '{path}' is null/none",
                        retryable=False
                    )

                converted = None
                if target_type == "string":
                    converted = str(val)
                elif target_type == "integer":
                    converted = int(val)
                elif target_type == "float":
                    converted = float(val)
                elif target_type == "boolean":
                    if isinstance(val, str):
                        converted = val.lower() in ("true", "1", "yes", "t")
                    else:
                        converted = bool(val)
                elif target_type == "json":
                    if isinstance(val, str):
                        converted = json.loads(val)
                    else:
                        converted = val
                else:
                    return ActionResult(
                        success=False,
                        output={},
                        error=f"Unsupported target_type '{target_type}'",
                        retryable=False
                    )

                return ActionResult(
                    success=True,
                    output={"result": converted, "type": target_type}
                )

            else:
                return ActionResult(
                    success=False,
                    output={},
                    error=f"Unknown transformation operation '{operation}'",
                    retryable=False
                )

        except Exception as e:
            return ActionResult(
                success=False,
                output={},
                error=f"JSON transformation failed: {str(e)}",
                retryable=False
            )
