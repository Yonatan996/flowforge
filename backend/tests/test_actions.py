import pytest
from backend.app.services.actions.transform_action import JsonTransformAction
from backend.app.services.actions.condition_action import ConditionAction


@pytest.mark.asyncio
async def test_transform_select_path():
    action = JsonTransformAction()
    ctx = {
        "input": {"user": {"profile": {"age": 30}}},
        "steps": {"prev": {"output": {"token": "xyz"}}}
    }

    # Extract nested value
    res = await action.execute({"operation": "select_path", "path": "input.user.profile.age"}, ctx)
    assert res.success is True
    assert res.output["result"] == 30

    # Extract step output
    res2 = await action.execute({"operation": "select_path", "path": "steps.prev.output.token"}, ctx)
    assert res2.success is True
    assert res2.output["result"] == "xyz"


@pytest.mark.asyncio
async def test_transform_rename_keys():
    action = JsonTransformAction()
    ctx = {
        "input": {"old_id": 123, "name": "Item A"}
    }
    res = await action.execute({
        "operation": "rename_keys",
        "path": "input",
        "mappings": {"old_id": "item_id"}
    }, ctx)
    assert res.success is True
    assert res.output["result"]["item_id"] == 123
    assert res.output["result"]["name"] == "Item A"


@pytest.mark.asyncio
async def test_transform_construct_object():
    action = JsonTransformAction()
    ctx = {
        "input": {"order_id": 999, "customer": "Alice"}
    }
    res = await action.execute({
        "operation": "construct_object",
        "template": {
            "id": "$input.order_id",
            "client": "$input.customer",
            "source": "automated"
        }
    }, ctx)
    assert res.success is True
    assert res.output["result"] == {"id": 999, "client": "Alice", "source": "automated"}


@pytest.mark.asyncio
async def test_transform_type_convert():
    action = JsonTransformAction()
    ctx = {"input": {"count_str": "42", "flag_str": "true"}}

    res_int = await action.execute({"operation": "type_convert", "path": "input.count_str", "target_type": "integer"}, ctx)
    assert res_int.success is True
    assert res_int.output["result"] == 42

    res_bool = await action.execute({"operation": "type_convert", "path": "input.flag_str", "target_type": "boolean"}, ctx)
    assert res_bool.success is True
    assert res_bool.output["result"] is True


@pytest.mark.asyncio
async def test_condition_evaluation():
    action = ConditionAction()
    ctx = {"input": {"score": 85, "role": "admin", "tags": ["prod", "web"]}}

    # Greater than (True)
    res_gt = await action.execute({
        "left_operand": "input.score",
        "operator": "greater_than",
        "right_operand": 50
    }, ctx)
    assert res_gt.success is True
    assert res_gt.output["condition_met"] is True
    assert res_gt.should_skip_subsequent is False

    # Greater than (False -> skip subsequent)
    res_gt_false = await action.execute({
        "left_operand": "input.score",
        "operator": "greater_than",
        "right_operand": 100
    }, ctx)
    assert res_gt_false.success is True
    assert res_gt_false.output["condition_met"] is False
    assert res_gt_false.should_skip_subsequent is True

    # Contains in array
    res_contains = await action.execute({
        "left_operand": "input.tags",
        "operator": "contains",
        "right_operand": "prod"
    }, ctx)
    assert res_contains.success is True
    assert res_contains.output["condition_met"] is True

    # Exists
    res_exists = await action.execute({
        "left_operand": "input.role",
        "operator": "exists"
    }, ctx)
    assert res_exists.success is True
    assert res_exists.output["condition_met"] is True
