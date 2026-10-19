import pytest
from backend.app.services.actions.http_action import validate_target_url, redact_headers, HttpRequestAction


def test_ssrf_disallowed_addresses():
    disallowed_urls = [
        "http://localhost/admin",
        "http://127.0.0.1:8000/internal",
        "http://127.0.0.2:80",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://[::ffff:169.254.169.254]/",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/sensitive",
        "http://192.168.1.1:8080/router",
        "http://172.16.0.1:5432/",
        "http://100.64.0.1/cgnat",
        "http://192.0.2.1/test-net",
        "http://198.18.0.1/benchmark",
        "file:///etc/passwd",
        "gopher://127.0.0.1:6379",
        "ftp://example.com/file",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://user:password@example.com/",
        "http://example.com:22/",
        "http://example.com:6379/",
        "http://example.com:5432/",
    ]

    for url in disallowed_urls:
        with pytest.raises(ValueError):
            validate_target_url(url)


def test_header_sanitization():
    headers = {
        "Authorization": "Bearer super_secret_token_12345",
        "Cookie": "session=sensitive_cookie_value",
        "X-Api-Key": "api_secret_key_9999",
        "Content-Type": "application/json",
        "User-Agent": "FlowForge/1.0",
    }
    redacted = redact_headers(headers)
    assert redacted["Authorization"] == "[REDACTED]"
    assert redacted["Cookie"] == "[REDACTED]"
    assert redacted["X-Api-Key"] == "[REDACTED]"
    assert redacted["Content-Type"] == "application/json"
    assert redacted["User-Agent"] == "FlowForge/1.0"


@pytest.mark.asyncio
async def test_http_action_ssrf_execution_block():
    action = HttpRequestAction()
    result = await action.execute(
        config={"url": "http://127.0.0.1:8000/api", "method": "GET"},
        context={}
    )
    assert result.success is False
    assert "SSRF validation blocked" in result.error
    assert result.retryable is False


def test_mixed_dns_answers_blocked(monkeypatch):
    import socket

    def mock_getaddrinfo(host, port, *args, **kwargs):
        return [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port)),
        ]

    monkeypatch.setattr(socket, "getaddrinfo", mock_getaddrinfo)
    with pytest.raises(ValueError, match="resolved to disallowed IP"):
        validate_target_url("http://mixed-dns.example.com/api")
