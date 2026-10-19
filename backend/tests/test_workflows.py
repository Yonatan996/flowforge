import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_workflow_lifecycle(client: AsyncClient, auth_headers: dict):
    # 1. Create a draft workflow
    create_payload = {
        "name": "Order Ingestion Flow",
        "description": "Validates and notifies order status",
        "trigger_type": "webhook",
        "definition_json": {
            "trigger": {
                "type": "webhook",
                "config": {"required_fields": ["order_id", "amount"]}
            },
            "steps": [
                {
                    "key": "extract_amount",
                    "name": "Extract Amount",
                    "type": "json_transform",
                    "config": {
                        "operation": "select_path",
                        "path": "input.amount"
                    }
                },
                {
                    "key": "check_threshold",
                    "name": "Check Threshold",
                    "type": "condition",
                    "config": {
                        "left_operand": "steps.extract_amount.output.result",
                        "operator": "greater_than",
                        "right_operand": 100
                    }
                }
            ]
        }
    }
    res = await client.post("/api/v1/workflows", json=create_payload, headers=auth_headers)
    assert res.status_code == 201
    wf = res.json()
    wf_id = wf["id"]
    assert wf["status"] == "draft"
    assert wf["version"] == 1
    assert wf["webhook_token"] is not None

    # 2. Validate workflow definition
    val_res = await client.post(f"/api/v1/workflows/{wf_id}/validate", headers=auth_headers)
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True

    # 3. Activate workflow
    act_res = await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=auth_headers)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"

    # 4. Deactivate workflow
    deact_res = await client.post(f"/api/v1/workflows/{wf_id}/deactivate", headers=auth_headers)
    assert deact_res.status_code == 200
    assert deact_res.json()["status"] == "inactive"

    # 5. Duplicate workflow
    dup_res = await client.post(f"/api/v1/workflows/{wf_id}/duplicate", headers=auth_headers)
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert "(Copy)" in dup_data["name"]
    assert dup_data["status"] == "draft"

    # 6. Delete workflow
    del_res = await client.delete(f"/api/v1/workflows/{wf_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Ensure deleted
    get_res = await client.get(f"/api/v1/workflows/{wf_id}", headers=auth_headers)
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_invalid_workflow_activation_blocked(client: AsyncClient, auth_headers: dict):
    # Workflow with zero steps should not activate
    empty_wf = await client.post("/api/v1/workflows", json={
        "name": "Empty Flow",
        "trigger_type": "manual",
        "definition_json": {"trigger": {"type": "manual", "config": {}}, "steps": []}
    }, headers=auth_headers)
    wf_id = empty_wf.json()["id"]

    act_res = await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=auth_headers)
    assert act_res.status_code == 400
    assert "at least one step" in act_res.json()["detail"].lower()
