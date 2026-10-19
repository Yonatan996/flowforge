# FlowForge

**FlowForge** is an enterprise-grade, developer-first workflow automation platform built with FastAPI, SQLAlchemy 2.x async ORM, PostgreSQL, Redis task queues, and a modern React 19 + TypeScript frontend.

FlowForge enables users to build, activate, test, execute, monitor, and debug complex multi-step automated workflows with full execution inspection and strict security isolation.

---

## 🌟 Key Features

- **Workflow Builder**: Visual step-based builder with reorderable action cards, real-time validation, draft saves, activation controls, and workflow duplication.
- **Trigger Engines**:
  - **Incoming Webhooks**: Hard-to-guess webhook endpoints, payload schema enforcement, 1 MB payload protection, and idempotency deduplication (`Idempotency-Key`).
  - **Scheduled Cron / Interval Triggers**: Distributed UTC cron dispatching preventing double-dispatching across multi-worker instances.
  - **Manual Trigger**: Interactive on-demand runs with custom test JSON payloads.
- **Action Pipeline Steps**:
  - **HTTP Request**: Outbound REST calls (GET, POST, PUT, DELETE) with bounded timeouts, response size limits (512 KB), sensitive header redaction (`[REDACTED]`), and **military-grade SSRF defense** (blocks RFC 1918 private IPs, loopback, link-local, multicast, cloud metadata `169.254.169.254`, and DNS rebinding pinning).
  - **JSON Transformation**: Path selection via dot-notation (`input.user.id`, `steps.prev.output`), dictionary key remapping, structured object templating, and type casting.
  - **Condition Branching**: Relational operators (`equals`, `not_equals`, `greater_than`, `less_than`, `contains`, `exists`, `not_exists`) that dynamically decide whether to proceed or skip subsequent steps.
- **Execution & Retry Engine**:
  - Version snapshotting: Workflow definitions are captured immutably at execution time.
  - Configurable retries with exponential backoff and jitter.
  - Non-blocking database transactions: DB connections are released during external network requests.
  - Crash recovery: Background daemon detects abandoned `RUNNING` executions and marks them safely as `FAILED`.
- **Security & Multi-Tenancy**:
  - Argon2id password hashing (RFC 9106).
  - Strict server-side ownership isolation: Cross-user data is inaccessible (returns 404).
  - Endpoint rate limiting protecting against credential brute-forcing.
- **Real-Time Execution Inspector**:
  - Full execution timeline and step-by-step breakdown.
  - Sanitized input and output JSON inspection.
  - Live execution polling and 1-click retry.
- **Dashboard & Analytics**:
  - Real metrics: Total workflows, active workflows, throughput, average duration, and success rates.
  - 7-day trend analysis chart rendered with Recharts.

---

## 🏗️ Architecture

```
                                      +-------------------------+
                                      |   React 19 + Vite SPA   |
                                      +------------+------------+
                                                   | HTTP / REST
                                                   v
+------------------+                  +-------------------------+                  +-------------------+
| External Webhook |  POST /webhooks  |   FastAPI REST Engine   |  Enqueues Job    | Redis Task Queue  |
|     Senders      +----------------->+  (Auth, CRUD, Validate) +----------------->+ (In-Memory Fall- |
+------------------+                  +------------+------------+                  |    back in Dev)   |
                                                   |                               +---------+---------+
                                                   | SQLAlchemy                              |
                                                   v Async                                   | Dequeues
                                      +------------+------------+                            v
                                      | PostgreSQL / SQLite Async|                 +---------+---------+
                                      | (Workflows, Executions) |                 | Background Worker |
                                      +-------------------------+                 | Execution Engine  |
                                                                                   +---------+---------+
                                                                                             |
                                                                              Outbound HTTP  | (SSRF Guarded)
                                                                              & Transforms   v
                                                                                   +---------+---------+
                                                                                   | 3rd-Party APIs /  |
                                                                                   | Services          |
                                                                                   +-------------------+
```

---

## 🚀 Quickstart (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+ and npm

### 1. Clone & Configure Environment
```bash
git clone https://github.com/your-org/flowforge.git
cd flowforge
cp .env.example .env
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations
alembic upgrade head

# Start backend server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be available at: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker & Production Deployment

FlowForge includes complete multi-container Docker Compose definitions.

```bash
# Start all services (PostgreSQL, Redis, API, Worker, Scheduler, Frontend Nginx)
docker compose up -d --build

# View logs
docker compose logs -f

# Check health
curl http://localhost:8000/health
```

### Required Persistent Services in Production
1. **PostgreSQL 16**: Primary persistent store for users, workflows, execution records, and steps.
2. **Redis 7**: Distributed queue broker and coordination engine.
3. **API Process**: `uvicorn backend.app.main:app` serving public REST API endpoints.
4. **Worker Process**: `python -m backend.app.worker` processing background job queue.
5. **Scheduler Process**: `python -m backend.app.scheduler_worker` checking and dispatching scheduled jobs.

---

## 🧪 Automated Testing

### Backend Tests (Pytest)
Run the comprehensive 31-test backend test suite covering Authentication, Workflow CRUD, SSRF Security & DNS Pinning, Retries & Exponential Backoff, Idempotency & Concurrency, Multi-Tenant Isolation, and End-to-End User Journeys:
```bash
.\.venv\Scripts\pytest backend\tests -v
```

### Frontend Tests (Vitest)
Run the frontend unit tests covering components, badges, action cards, and JSON rendering:
```bash
cd frontend
npm test
```

### Frontend Production Build Check
```bash
cd frontend
npm run build
```

---

## 🔒 Security Measures

1. **Military-Grade SSRF Defense & Socket Pinning**:
   - Outbound HTTP requests parse and resolve all DNS records prior to connection.
   - Comprehensive IP filtering: blocks RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`), multicast, carrier-grade NAT (`100.64.0.0/10`), IPv4-mapped IPv6 (`::ffff:...`), 6to4 addresses (`2002::/16`), benchmarking (`198.18.0.0/15`), test networks (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), and cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
   - Mixed DNS response protection: If any resolved record is private, the entire request is blocked.
   - Socket-level IP pinning: Custom `PinnedNetworkBackend` forces the underlying TCP socket to connect strictly to the pre-validated IP address, defeating DNS rebinding windows while preserving TLS SNI and certificate validation.
   - Dangerous port blocking: Non-HTTP internal service ports (SSH 22, Redis 6379, Postgres 5432, MySQL 3306, Docker 2375/2376, etc.) are strictly disallowed.
   - User credentials in URLs (`http://user:pass@host`) are rejected.
   - Redirects disabled by default (`ALLOW_REDIRECTS = False`).
   - Response size caps (512 KB max) and request timeouts (10s max connect 5s).
2. **Credential & Secret Redaction**:
   - Headers containing authentication tokens, keys, passwords, cookies, or secrets are systematically sanitized (`[REDACTED]`) before database persistence or application logging.
3. **Multi-Tenant Ownership Isolation**:
   - Every read, write, execution, schedule, retry, and step log query explicitly enforces `owner_id == current_user.id`.
   - Access attempts to other users' resources return `404 Not Found` to prevent user/resource enumeration.
4. **Password Hashing & Session Protection**:
   - Passwords hashed using Argon2id with 64 MB memory cost and 2 time iterations (RFC 9106).
   - Rate limiting on sensitive endpoints (15 requests/minute per IP) prevents credential brute-forcing.
   - Production secrets validation: Requires `>= 32` characters and rejects default development placeholders in production.
   - Session cookies configured with `HttpOnly`, `SameSite=Lax`, and dynamic `Secure=True` in production.
5. **Distributed Coordination & Idempotency**:
   - Webhook idempotency enforced via `(workflow_id, idempotency_key)` database unique constraint, preventing race conditions under concurrent deliveries.
   - Atomic scheduler job claiming (`update ... where next_run_at <= now returning id`) prevents double-dispatching across multiple scheduler instances.

---

## 📄 License
MIT License. Built for portfolio and production automation demonstration.
