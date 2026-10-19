import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cross_user_isolation(
    client: AsyncClient,
    auth_headers: dict,
    second_user_auth_headers: dict
):
    # User A creates a workflow
    create_res = await client.post("/api/v1/workflows", json={
        "name": "User A Private Flow",
        "trigger_type": "manual",
        "definition_json": {
            "trigger": {"type": "manual", "config": {}},
            "steps": [
                {
                    "key": "step1",
                    "name": "Step 1",
                    "type": "json_transform",
                    "config": {"operation": "select_path", "path": "input.data"}
                }
            ]
        }
    }, headers=auth_headers)
    wf_id = create_res.json()["id"]

    # User A triggers an execution
    run_res = await client.post(f"/api/v1/workflows/{wf_id}/run", json={"payload": {"data": "secret"}}, headers=auth_headers)
    exec_id = run_res.json()["id"]

    # 1. User B tries to view User A's workflow -> 404
    u2_get_wf = await client.get(f"/api/v1/workflows/{wf_id}", headers=second_user_auth_headers)
    assert u2_get_wf.status_code == 404

    # 2. User B tries to update User A's workflow -> 404
    u2_patch_wf = await client.patch(f"/api/v1/workflows/{wf_id}", json={"name": "Hacked"}, headers=second_user_auth_headers)
    assert u2_patch_wf.status_code == 404

    # 3. User B tries to delete User A's workflow -> 404
    u2_del_wf = await client.delete(f"/api/v1/workflows/{wf_id}", headers=second_user_auth_headers)
    assert u2_del_wf.status_code == 404

    # 4. User B tries to run User A's workflow -> 404
    u2_run_wf = await client.post(f"/api/v1/workflows/{wf_id}/run", json={"payload": {}}, headers=second_user_auth_headers)
    assert u2_run_wf.status_code == 404

    # 5. User B tries to inspect User A's execution -> 404
    u2_get_exec = await client.get(f"/api/v1/executions/{exec_id}", headers=second_user_auth_headers)
    assert u2_get_exec.status_code == 404

    # 6. User B tries to retry User A's execution -> 404
    u2_retry = await client.post(f"/api/v1/executions/{exec_id}/retry", headers=second_user_auth_headers)
    assert u2_retry.status_code == 404

    # 7. User B tries to inspect User A's execution steps -> 404
    u2_steps = await client.get(f"/api/v1/executions/{exec_id}/steps", headers=second_user_auth_headers)
    assert u2_steps.status_code == 404

    # 8. User B listing workflows must not see User A's workflow
    u2_list_wf = await client.get("/api/v1/workflows", headers=second_user_auth_headers)
    wf_ids = [w["id"] for w in u2_list_wf.json()]
    assert wf_id not in wf_ids
