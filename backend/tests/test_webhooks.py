import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_webhook_ingestion_and_idempotency(client: AsyncClient, auth_headers: dict):
    # Create and activate a webhook workflow
    wf_res = await client.post("/api/v1/workflows", json={
        "name": "Stripe Webhook Listener",
        "trigger_type": "webhook",
        "definition_json": {
            "trigger": {
                "type": "webhook",
                "config": {"required_fields": ["event_id"]}
            },
            "steps": [
                {
                    "key": "step1",
                    "name": "Extract Event",
                    "type": "json_transform",
                    "config": {"operation": "select_path", "path": "input.event_id"}
                }
            ]
        }
    }, headers=auth_headers)
    wf_data = wf_res.json()
    wf_id = wf_data["id"]
    webhook_token = wf_data["webhook_token"]

    # Try sending webhook while workflow is in draft status -> 400
    pre_act_resp = await client.post(f"/api/v1/webhooks/{webhook_token}", json={"event_id": "evt_123"})
    assert pre_act_resp.status_code == 400

    # Activate workflow
    await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=auth_headers)

    # 1. Send first webhook request with Idempotency-Key
    resp1 = await client.post(
        f"/api/v1/webhooks/{webhook_token}",
        json={"event_id": "evt_123"},
        headers={"Idempotency-Key": "unique-idempotency-key-001"}
    )
    assert resp1.status_code == 202
    data1 = resp1.json()
    exec1_id = data1["execution_id"]

    # 2. Re-send exact duplicate webhook request with same Idempotency-Key
    resp2 = await client.post(
        f"/api/v1/webhooks/{webhook_token}",
        json={"event_id": "evt_123"},
        headers={"Idempotency-Key": "unique-idempotency-key-001"}
    )
    assert resp2.status_code == 202
    data2 = resp2.json()
    # Must return existing execution without creating duplicate
    assert data2["execution_id"] == exec1_id


@pytest.mark.asyncio
async def test_webhook_oversized_payload_rejection(client: AsyncClient, auth_headers: dict):
    wf_res = await client.post("/api/v1/workflows", json={
        "name": "Size Test Flow",
        "trigger_type": "webhook",
        "definition_json": {
            "trigger": {"type": "webhook", "config": {}},
            "steps": [
                {"key": "s1", "name": "S1", "type": "json_transform", "config": {"operation": "select_path", "path": "input"}}
            ]
        }
    }, headers=auth_headers)
    token = wf_res.json()["webhook_token"]
    wf_id = wf_res.json()["id"]
    await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=auth_headers)

    # Payload > 1 MB
    huge_data = {"big": "a" * (1024 * 1024 + 100)}
    res = await client.post(f"/api/v1/webhooks/{token}", json=huge_data)
    assert res.status_code == 413


@pytest.mark.asyncio
async def test_concurrent_duplicate_webhooks(client: AsyncClient, auth_headers: dict):
    import asyncio

    wf_res = await client.post("/api/v1/workflows", json={
        "name": "Concurrent Webhook Test Flow",
        "trigger_type": "webhook",
        "definition_json": {
            "trigger": {"type": "webhook", "config": {}},
            "steps": [
                {"key": "s1", "name": "S1", "type": "json_transform", "config": {"operation": "select_path", "path": "input"}}
            ]
        }
    }, headers=auth_headers)
    token = wf_res.json()["webhook_token"]
    wf_id = wf_res.json()["id"]
    await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=auth_headers)

    # Fire 5 concurrent requests with the SAME idempotency key
    key = "concurrent-race-key-999"
    tasks = [
        client.post(
            f"/api/v1/webhooks/{token}",
            json={"data": "test_payload"},
            headers={"Idempotency-Key": key}
        )
        for _ in range(5)
    ]
    results = await asyncio.gather(*tasks)

    # All requests must succeed with 202 Accepted
    for r in results:
        assert r.status_code == 202

    # All requests must resolve to the EXACT SAME execution ID
    exec_ids = {r.json()["execution_id"] for r in results}
    assert len(exec_ids) == 1


@pytest.mark.asyncio
async def test_webhook_content_type_validation(client: AsyncClient, auth_headers: dict):
    wf_res = await client.post("/api/v1/workflows", json={
        "name": "Content Type Flow",
        "trigger_type": "webhook",
        "definition_json": {
            "trigger": {"type": "webhook", "config": {}},
            "steps": [
                {"key": "s1", "name": "S1", "type": "json_transform", "config": {"operation": "select_path", "path": "input"}}
            ]
        }
    }, headers=auth_headers)
    token = wf_res.json()["webhook_token"]
    wf_id = wf_res.json()["id"]
    await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=auth_headers)

    # Send plain text body with text/plain Content-Type -> 415 Unsupported Media Type
    res = await client.post(
        f"/api/v1/webhooks/{token}",
        content=b"not json",
        headers={"Content-Type": "text/plain"}
    )
    assert res.status_code == 415
