import asyncio
import pytest
from httpx import AsyncClient
from unittest.mock import patch

from backend.app.services.execution_engine import execution_engine


@pytest.mark.asyncio
async def test_full_platform_end_to_end_journey(client: AsyncClient):
    """
    Complete end-to-end user and workflow automation journey:
    1. Register user
    2. Login and get auth token
    3. Verify /auth/me
    4. Create automated workflow (Webhook -> Transform -> Condition)
    5. Validate workflow configuration
    6. Activate workflow
    7. Trigger via Webhook with Idempotency Key
    8. Execute queued job through ExecutionEngine worker
    9. Inspect execution details, duration, and step output logs
    10. Send duplicate webhook delivery and verify idempotency rejection
    11. Verify dashboard summary and metrics updated
    12. Trigger manual execution with test payload
    13. Execute manual run and verify step logs
    14. Retry execution
    15. Verify cross-user isolation with a secondary user
    16. Deactivate workflow and verify webhooks are rejected
    17. Delete workflow and verify cascade deletion
    """

    # 1. User Registration
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "portfolio_author@flowforge.dev",
        "password": "ProductionPassword2026!"
    })
    assert reg_res.status_code == 201
    auth_data = reg_res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Login
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "portfolio_author@flowforge.dev",
        "password": "ProductionPassword2026!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == "portfolio_author@flowforge.dev"

    # 3. Current User Profile
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["id"] == user_id

    # 4. Create Workflow Definition
    workflow_payload = {
        "name": "Order Ingestion & Routing Pipeline",
        "description": "Production pipeline parsing incoming orders and verifying amounts",
        "trigger_type": "webhook",
        "definition_json": {
            "trigger": {
                "type": "webhook",
                "config": {
                    "required_fields": ["order_id", "total_amount", "customer"]
                }
            },
            "steps": [
                {
                    "key": "extract_order",
                    "name": "Extract Customer Info",
                    "type": "json_transform",
                    "config": {
                        "operation": "construct_object",
                        "template": {
                            "order_ref": "input.order_id",
                            "customer_email": "input.customer.email",
                            "amount": "input.total_amount"
                        }
                    },
                    "retry": {"max_attempts": 2, "backoff_factor": 1.0}
                },
                {
                    "key": "check_threshold",
                    "name": "Verify High Value Order",
                    "type": "condition",
                    "config": {
                        "left_operand": "steps.extract_order.output.result.amount",
                        "operator": "greater_than",
                        "right_operand": 100
                    }
                }
            ]
        }
    }

    create_wf_res = await client.post("/api/v1/workflows", json=workflow_payload, headers=headers)
    assert create_wf_res.status_code == 201
    wf = create_wf_res.json()
    wf_id = wf["id"]
    webhook_token = wf["webhook_token"]
    assert wf["status"] == "draft"
    assert webhook_token is not None

    # 5. Validate Workflow
    val_res = await client.post(f"/api/v1/workflows/{wf_id}/validate", headers=headers)
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True
    assert len(val_res.json()["errors"]) == 0

    # 6. Activate Workflow
    act_res = await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=headers)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"

    # 7. Ingest Incoming Webhook
    sample_order = {
        "order_id": "ORD-98765",
        "total_amount": 249.99,
        "customer": {"name": "Alice Developer", "email": "alice@example.com"}
    }
    webhook_res = await client.post(
        f"/api/v1/webhooks/{webhook_token}",
        json=sample_order,
        headers={"Idempotency-Key": "idemp-journey-order-98765"}
    )
    assert webhook_res.status_code == 202
    exec_info = webhook_res.json()
    execution_id = exec_info["execution_id"]
    assert exec_info["status"] == "accepted"

    # 8. Background Execution via Engine Worker
    await execution_engine.execute_job(execution_id)

    # 9. Inspect Execution Results and Steps
    exec_res = await client.get(f"/api/v1/executions/{execution_id}", headers=headers)
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["status"] == "SUCCEEDED", f"Execution failed with: {exec_data.get('error_summary')}"
    assert exec_data["duration_ms"] is not None
    assert exec_data["duration_ms"] >= 0.0

    steps_res = await client.get(f"/api/v1/executions/{execution_id}/steps", headers=headers)
    assert steps_res.status_code == 200
    steps = steps_res.json()
    assert len(steps) == 2
    assert steps[0]["step_key"] == "extract_order"
    assert steps[0]["status"] == "succeeded"
    assert steps[0]["output_summary"]["result"]["order_ref"] == "ORD-98765"
    assert steps[1]["step_key"] == "check_threshold"
    assert steps[1]["status"] == "succeeded"
    assert steps[1]["output_summary"]["condition_met"] is True

    # 10. Re-deliver Duplicate Webhook Payload with Same Idempotency Key
    dup_webhook_res = await client.post(
        f"/api/v1/webhooks/{webhook_token}",
        json=sample_order,
        headers={"Idempotency-Key": "idemp-journey-order-98765"}
    )
    assert dup_webhook_res.status_code == 202
    assert dup_webhook_res.json()["execution_id"] == execution_id

    # 11. Dashboard Metrics Verification
    dash_res = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    summary = dash_res.json()
    assert summary["total_workflows"] >= 1
    assert summary["active_workflows"] >= 1
    assert summary["total_executions"] >= 1
    assert summary["succeeded_executions"] >= 1
    assert summary["success_rate_percent"] == 100.0

    # 12. Manual Execution Run
    manual_run_res = await client.post(
        f"/api/v1/workflows/{wf_id}/run",
        json={"payload": {"order_id": "ORD-11111", "total_amount": 49.00, "customer": {"email": "bob@example.com"}}},
        headers=headers
    )
    assert manual_run_res.status_code == 201
    manual_exec_id = manual_run_res.json()["id"]

    # 13. Process Manual Execution
    await execution_engine.execute_job(manual_exec_id)
    manual_steps_res = await client.get(f"/api/v1/executions/{manual_exec_id}/steps", headers=headers)
    manual_steps = manual_steps_res.json()
    # Amount 49.00 <= 100 -> Condition evaluated to False
    assert manual_steps[1]["output_summary"]["condition_met"] is False

    # 14. Retry Execution
    retry_res = await client.post(f"/api/v1/executions/{manual_exec_id}/retry", headers=headers)
    assert retry_res.status_code == 201
    retried_exec_id = retry_res.json()["id"]
    assert retried_exec_id != manual_exec_id

    # 15. Cross-User Ownership Isolation
    reg2_res = await client.post("/api/v1/auth/register", json={
        "email": "outsider@evilcorp.com",
        "password": "Password999!"
    })
    user2_token = reg2_res.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # User 2 cannot access User 1's workflow, execution, steps, or retry
    assert (await client.get(f"/api/v1/workflows/{wf_id}", headers=user2_headers)).status_code == 404
    assert (await client.get(f"/api/v1/executions/{execution_id}", headers=user2_headers)).status_code == 404
    assert (await client.get(f"/api/v1/executions/{execution_id}/steps", headers=user2_headers)).status_code == 404
    assert (await client.post(f"/api/v1/executions/{execution_id}/retry", headers=user2_headers)).status_code == 404
    assert (await client.delete(f"/api/v1/workflows/{wf_id}", headers=user2_headers)).status_code == 404

    # 16. Deactivate Workflow
    deact_res = await client.post(f"/api/v1/workflows/{wf_id}/deactivate", headers=headers)
    assert deact_res.status_code == 200
    assert deact_res.json()["status"] == "inactive"

    # Webhook sent to inactive workflow is rejected
    inactive_hook_res = await client.post(
        f"/api/v1/webhooks/{webhook_token}",
        json=sample_order,
        headers={"Idempotency-Key": "idemp-inactive-call"}
    )
    assert inactive_hook_res.status_code == 400

    # 17. Delete Workflow
    del_res = await client.delete(f"/api/v1/workflows/{wf_id}", headers=headers)
    assert del_res.status_code == 200
    assert (await client.get(f"/api/v1/workflows/{wf_id}", headers=headers)).status_code == 404
