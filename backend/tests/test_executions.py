import asyncio
import pytest
from httpx import AsyncClient
from backend.app.services.execution_engine import execution_engine


@pytest.mark.asyncio
async def test_end_to_end_execution_flow(client: AsyncClient, auth_headers: dict):
    # Create workflow with 3 steps: transform -> condition -> transform
    wf_payload = {
        "name": "E2E Pipeline",
        "trigger_type": "manual",
        "definition_json": {
            "trigger": {"type": "manual", "config": {}},
            "steps": [
                {
                    "key": "parse_user",
                    "name": "Parse User Info",
                    "type": "json_transform",
                    "config": {
                        "operation": "select_path",
                        "path": "input.user_id"
                    }
                },
                {
                    "key": "check_user",
                    "name": "Check User ID",
                    "type": "condition",
                    "config": {
                        "left_operand": "steps.parse_user.output.result",
                        "operator": "equals",
                        "right_operand": "USR-100"
                    }
                },
                {
                    "key": "final_step",
                    "name": "Final Action",
                    "type": "json_transform",
                    "config": {
                        "operation": "construct_object",
                        "template": {"confirmed": True, "uid": "$steps.parse_user.output.result"}
                    }
                }
            ]
        }
    }
    wf_res = await client.post("/api/v1/workflows", json=wf_payload, headers=auth_headers)
    assert wf_res.status_code == 201
    wf_id = wf_res.json()["id"]

    # Trigger manual execution with matching user_id
    run_res = await client.post(f"/api/v1/workflows/{wf_id}/run", json={"payload": {"user_id": "USR-100"}}, headers=auth_headers)
    assert run_res.status_code == 201
    exec_id = run_res.json()["id"]

    # Directly execute job in test
    await execution_engine.execute_job(exec_id)

    # Inspect execution
    get_res = await client.get(f"/api/v1/executions/{exec_id}", headers=auth_headers)
    assert get_res.status_code == 200
    exec_data = get_res.json()
    assert exec_data["status"] == "SUCCEEDED"
    assert len(exec_data["steps"]) == 3
    assert all(s["status"] == "succeeded" for s in exec_data["steps"])

    # Test retry endpoint
    retry_res = await client.post(f"/api/v1/executions/{exec_id}/retry", headers=auth_headers)
    assert retry_res.status_code == 201
    retry_id = retry_res.json()["id"]
    assert retry_id != exec_id
    assert retry_res.json()["status"] == "QUEUED"


@pytest.mark.asyncio
async def test_execution_condition_skip(client: AsyncClient, auth_headers: dict):
    # Create workflow where condition evaluates to false
    wf_payload = {
        "name": "Skip Test Pipeline",
        "trigger_type": "manual",
        "definition_json": {
            "trigger": {"type": "manual", "config": {}},
            "steps": [
                {
                    "key": "cond_step",
                    "name": "Condition Step",
                    "type": "condition",
                    "config": {
                        "left_operand": "input.value",
                        "operator": "greater_than",
                        "right_operand": 50
                    }
                },
                {
                    "key": "step_should_be_skipped",
                    "name": "Skipped Step",
                    "type": "json_transform",
                    "config": {
                        "operation": "select_path",
                        "path": "input.value"
                    }
                }
            ]
        }
    }
    wf_res = await client.post("/api/v1/workflows", json=wf_payload, headers=auth_headers)
    wf_id = wf_res.json()["id"]

    # Run with value = 10 (condition fails -> 10 not > 50)
    run_res = await client.post(f"/api/v1/workflows/{wf_id}/run", json={"payload": {"value": 10}}, headers=auth_headers)
    exec_id = run_res.json()["id"]

    await execution_engine.execute_job(exec_id)

    get_res = await client.get(f"/api/v1/executions/{exec_id}", headers=auth_headers)
    exec_data = get_res.json()
    assert exec_data["status"] == "SUCCEEDED"
    steps = exec_data["steps"]
    assert len(steps) == 2
    assert steps[0]["status"] == "succeeded"
    assert steps[1]["status"] == "skipped"
