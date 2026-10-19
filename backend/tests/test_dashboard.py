import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_metrics(client: AsyncClient, auth_headers: dict):
    # Fetch summary for user
    res = await client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_workflows" in data
    assert "active_workflows" in data
    assert "total_executions" in data
    assert "success_rate_percent" in data

    # Fetch execution trends
    trends_res = await client.get("/api/v1/dashboard/execution-trends?days=7", headers=auth_headers)
    assert trends_res.status_code == 200
    trends = trends_res.json()
    assert len(trends) >= 7
    assert "total" in trends[0]
    assert "succeeded" in trends[0]
    assert "failed" in trends[0]
