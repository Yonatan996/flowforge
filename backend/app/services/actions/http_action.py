import ipaddress
import socket
import urllib.parse
from typing import Any, Dict, List, Tuple
import httpcore
from httpcore._backends.anyio import AnyIOBackend
import httpx

from backend.app.core.config import settings
from backend.app.services.actions.base import BaseAction, ActionResult

SENSITIVE_HEADER_KEYS = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "api-key",
    "secret",
    "token",
    "password",
    "proxy-authorization",
    "bearer",
    "x-auth-token",
    "x-access-token",
    "private-token",
}

BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "metadata.google.internal",
    "instance-data",
}

BLOCKED_PORTS = {
    21,    # FTP
    22,    # SSH
    23,    # Telnet
    25,    # SMTP
    53,    # DNS
    110,   # POP3
    135,   # RPC
    137,   # NetBIOS
    138,   # NetBIOS
    139,   # NetBIOS
    143,   # IMAP
    445,   # SMB
    2375,  # Docker API
    2376,  # Docker API (TLS)
    3306,  # MySQL
    5432,  # PostgreSQL
    6379,  # Redis
    9200,  # Elasticsearch
    11211, # Memcached
    27017, # MongoDB
}

DISALLOWED_NETWORKS = [
    ipaddress.ip_network("100.64.0.0/10"),    # Carrier-grade NAT
    ipaddress.ip_network("198.18.0.0/15"),    # Benchmarking
    ipaddress.ip_network("192.0.2.0/24"),     # TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"),  # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),   # TEST-NET-3
    ipaddress.ip_network("240.0.0.0/4"),      # Reserved
]


def is_ip_disallowed(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Checks whether an IP address belongs to loopback, private, link-local, multicast, or cloud metadata."""
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        elif ip.sixtofour:
            return is_ip_disallowed(ip.sixtofour)

    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return True

    # Cloud metadata (169.254.169.254) is link-local, check explicitly
    if str(ip) == "169.254.169.254":
        return True

    # Check explicit disallowed networks
    for net in DISALLOWED_NETWORKS:
        if ip in net:
            return True

    return False


def validate_target_url(url_str: str) -> Tuple[str, str, int, str]:
    """
    Parses and validates the target URL against SSRF, blocked ports, and DNS restrictions.
    Returns: (scheme, hostname, port, resolved_ip)
    Raises ValueError on SSRF violations.
    """
    try:
        parsed = urllib.parse.urlparse(url_str)
    except Exception as e:
        raise ValueError(f"Invalid URL structure: {e}")

    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise ValueError(f"Unsupported scheme '{scheme}'. Only HTTP and HTTPS are allowed.")

    if parsed.username or parsed.password:
        raise ValueError("User credentials in URL are not allowed; use explicit request headers")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Missing hostname in URL")

    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".local") or hostname_lower.endswith(".internal"):
        raise ValueError(f"Access to host '{hostname}' is blocked by security policy")

    port = parsed.port or (443 if scheme == "https" else 80)
    if not (1 <= port <= 65535):
        raise ValueError(f"Invalid port number {port}")

    if port in BLOCKED_PORTS:
        raise ValueError(f"Access to port {port} is blocked by security policy")

    # Check if hostname is already a direct IP
    try:
        direct_ip = ipaddress.ip_address(hostname)
        if is_ip_disallowed(direct_ip):
            raise ValueError(f"Access to IP address '{hostname}' is forbidden (SSRF protection)")
        resolved_ip = str(direct_ip)
    except ValueError as e:
        if "is forbidden" in str(e):
            raise
        # Hostname is a domain name -> resolve via DNS
        try:
            addr_info = socket.getaddrinfo(hostname, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
            resolved_ips = [item[4][0] for item in addr_info]
            if not resolved_ips:
                raise ValueError(f"Could not resolve host '{hostname}'")

            for ip_candidate in resolved_ips:
                parsed_ip = ipaddress.ip_address(ip_candidate)
                if is_ip_disallowed(parsed_ip):
                    raise ValueError(f"Host '{hostname}' resolved to disallowed IP '{ip_candidate}'")

            resolved_ip = resolved_ips[0]
        except socket.gaierror as e:
            raise ValueError(f"DNS resolution failed for '{hostname}': {e}")

    return scheme, hostname, port, resolved_ip


def is_sensitive_header(key: str) -> bool:
    """Checks whether a header key contains sensitive credentials or tokens."""
    k = key.lower()
    if k in SENSITIVE_HEADER_KEYS:
        return True
    return any(term in k for term in ("auth", "secret", "token", "password", "cookie", "api-key", "apikey", "credential"))


def redact_headers(headers: Dict[str, Any]) -> Dict[str, str]:
    """Sanitizes headers dictionary for logging and persistence."""
    redacted = {}
    for k, v in headers.items():
        if is_sensitive_header(str(k)):
            redacted[str(k)] = "[REDACTED]"
        else:
            redacted[str(k)] = str(v)
    return redacted


class PinnedNetworkBackend(AnyIOBackend):
    """
    Network backend that forces the TCP socket connection to bind directly
    to a pre-validated IP address, eliminating DNS rebinding windows.
    """
    def __init__(self, pinned_ip: str):
        super().__init__()
        self.pinned_ip = pinned_ip

    async def connect_tcp(self, host: str, port: int, timeout: float | None = None, local_address: str | None = None, socket_options: Any = None):
        return await super().connect_tcp(
            self.pinned_ip,
            port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options
        )


class PinnedAsyncHTTPTransport(httpx.AsyncHTTPTransport):
    """
    Custom HTTP transport pinning the underlying socket connection to the pre-resolved IP,
    while allowing TLS SNI and certificate validation to use the hostname.
    """
    def __init__(self, pinned_ip: str, **kwargs):
        super().__init__(**kwargs)
        ssl_ctx = getattr(self._pool, "_ssl_context", None)
        self._pool = httpcore.AsyncConnectionPool(
            network_backend=PinnedNetworkBackend(pinned_ip),
            ssl_context=ssl_ctx,
            http1=True,
            http2=False
        )


class HttpRequestAction(BaseAction):
    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> ActionResult:
        url = config.get("url", "").strip()
        method = config.get("method", "GET").upper()
        headers = config.get("headers", {}) or {}
        body = config.get("body")
        timeout_seconds = min(max(float(config.get("timeout_seconds", 10.0)), 0.5), 30.0)

        # Validate URL and resolve DNS before making request
        try:
            scheme, hostname, port, resolved_ip = validate_target_url(url)
        except ValueError as err:
            return ActionResult(
                success=False,
                output={
                    "url": url,
                    "method": method,
                    "headers": redact_headers(headers),
                },
                error=f"SSRF validation blocked request: {err}",
                retryable=False
            )

        clean_headers = {str(k): str(v) for k, v in headers.items()}
        redacted_req_headers = redact_headers(clean_headers)

        try:
            # Use socket-level IP pinning transport
            transport = PinnedAsyncHTTPTransport(pinned_ip=resolved_ip, verify=True)

            async with httpx.AsyncClient(
                transport=transport,
                timeout=httpx.Timeout(timeout_seconds, connect=5.0),
                follow_redirects=settings.ALLOW_REDIRECTS,  # Redirects disabled to prevent evasion
            ) as client:
                req_kwargs: Dict[str, Any] = {
                    "method": method,
                    "url": url,
                    "headers": clean_headers,
                }
                if body is not None:
                    if isinstance(body, (dict, list)):
                        req_kwargs["json"] = body
                    else:
                        req_kwargs["content"] = str(body).encode("utf-8")

                resp = await client.request(**req_kwargs)

                # Check response size limit
                content_bytes = resp.content
                if len(content_bytes) > settings.MAX_RESPONSE_SIZE_BYTES:
                    return ActionResult(
                        success=False,
                        output={
                            "status_code": resp.status_code,
                            "url": url,
                            "headers": redact_headers(dict(resp.headers)),
                            "response_size_bytes": len(content_bytes),
                        },
                        error=f"Response exceeded maximum allowed size of {settings.MAX_RESPONSE_SIZE_BYTES} bytes",
                        retryable=False
                    )

                # Parse response preview
                preview = None
                try:
                    preview = resp.json()
                except Exception:
                    preview = resp.text[:2000]

                success = 200 <= resp.status_code < 300
                is_retryable = resp.status_code in (429, 502, 503, 504)

                return ActionResult(
                    success=success,
                    output={
                        "status_code": resp.status_code,
                        "url": url,
                        "request_headers": redacted_req_headers,
                        "response_headers": redact_headers(dict(resp.headers)),
                        "response_data": preview,
                    },
                    error=None if success else f"HTTP request failed with status code {resp.status_code}",
                    retryable=is_retryable
                )

        except httpx.TimeoutException as e:
            return ActionResult(
                success=False,
                output={"url": url, "method": method, "headers": redacted_req_headers},
                error=f"Request timed out after {timeout_seconds}s: {e}",
                retryable=True
            )
        except httpx.RequestError as e:
            return ActionResult(
                success=False,
                output={"url": url, "method": method, "headers": redacted_req_headers},
                error=f"HTTP network error: {e}",
                retryable=True
            )
        except Exception as e:
            return ActionResult(
                success=False,
                output={"url": url, "method": method, "headers": redacted_req_headers},
                error=f"Unexpected error executing HTTP request: {e}",
                retryable=False
            )
