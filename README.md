# FlowForge

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-39%20Passed-brightgreen.svg?style=flat)](#-automated-testing)

**FlowForge** is an enterprise-grade, developer-first workflow automation platform built with **FastAPI**, **SQLAlchemy 2.x async ORM**, **PostgreSQL 16**, **Redis 7 distributed task queues**, and a high-performance **React 19 + TypeScript** SPA.

It allows authenticated users to build, activate, test, execute, monitor, and debug complex multi-step automated workflows with live execution inspection, atomic distributed job locking, and socket-level SSRF defense.

---

## 📸 Platform Preview

### Real-Time Dashboard & Execution Analytics
![FlowForge Dashboard](docs/screenshots/02_dashboard.png)

### Visual Workflow Builder & Reorderable Action Cards
![Workflow Builder](docs/screenshots/04_builder.png)

### Step-by-Step Execution Inspector
![Execution Inspector](docs/screenshots/06_execution_inspector.png)

### Workflows Management & Status Control
![Workflows List](docs/screenshots/03_workflows.png)

### Audit-Grade Execution Log
![Executions List](docs/screenshots/05_executions.png)

---

## 🌟 Key Features

- **Visual Step-Based Builder**: Reorderable action cards, real-time schema validation, draft saves, activation guards, and one-click duplication.
- **Trigger Engines**:
  - **Incoming Webhooks**: Hard-to-guess tokenized endpoints, payload schema enforcement, 1 MB payload protection, and idempotency deduplication (`Idempotency-Key`).
  - **Scheduled Cron / Interval Triggers**: Distributed UTC cron dispatcher using atomic database locking to prevent double-dispatch across horizontally scaled scheduler instances.
  - **Manual Trigger**: Interactive on-demand runs with custom test JSON payloads.
- **Action Pipeline Steps**:
  - **HTTP Request**: Outbound REST calls (GET, POST, PUT, DELETE) with bounded timeouts, response size limits (512 KB), sensitive header redaction (`[REDACTED]`), and **military-grade SSRF defense** (blocks RFC 1918 private IPs, loopback, link-local, multicast, cloud metadata `169.254.169.254`, and DNS rebinding socket pinning).
  - **JSON Transformation**: Path selection via dot-notation (`input.user.id`, `steps.prev.output`), dictionary key remapping, structured object templating, and type casting.
  - **Condition Branching**: Relational operators (`equals`, `not_equals`, `greater_than`, `less_than`, `contains`, `exists`, `not_exists`) that dynamically evaluate state to continue or skip subsequent steps.
- **Execution & Retry Engine**:
  - Version snapshotting: Workflow definitions are captured immutably at execution time.
  - Configurable retries with exponential backoff and jitter.
  - Non-blocking database transactions: DB connections are released during external network requests.
  - Crash recovery: Background sweeper detects abandoned `RUNNING` executions and marks them safely as `FAILED`.
- **Security & Multi-Tenancy**:
  - Argon2id password hashing (RFC 9106).
  - Strict server-side ownership isolation: Cross-user data is inaccessible (returns 404).
  - Authentication rate limiting protecting against brute-force attacks.
- **Real-Time Execution Inspector**:
  - Full execution timeline and step-by-step breakdown.
  - Sanitized input and output JSON inspection.
  - Live execution polling and 1-click retry.
- **Dashboard & Analytics**:
  - Real metrics: Total workflows, active workflows, throughput, average duration, and success rates.
  - 7-day trend analysis chart rendered with Recharts.

---

## 🏗️ System Architecture

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
                                      | PostgreSQL 16 (Async)   |                 +---------+---------+
                                      | (Workflows, Executions) |                 | Background Worker |
                                      +-------------------------+                 | Execution Engine  |
                                                                                   +---------+---------+
                                                                                             |
                                                                              Outbound HTTP  | (SSRF Guarded)
                                                                              & Transforms   v
                                                                                   +---------+---------+
                                                                                   | 3rd-Party APIs /  |
                                                                                   | Cloud Services    |
                                                                                   +-------------------+
```

### Component Breakdown

1. **Frontend (Port 5173 / 80)**: React 19, TypeScript, Tailwind CSS, Lucide icons, TanStack React Query, React Router, Recharts.
2. **API Server (Port 8000)**: FastAPI with Pydantic v2 validation, Argon2id auth, rate limiting, and Alembic migrations.
3. **Dedicated Worker**: Async consumer polling the Redis queue and processing pipeline steps with row-level database locking.
4. **Scheduler Daemon**: Evaluates cron expressions and interval timers in UTC, dispatching due jobs atomically.
5. **PostgreSQL 16**: Primary persistent store with foreign key cascades and unique compound idempotency constraints.
6. **Redis 7**: High-performance broker for asynchronous queue dispatch and worker coordination.

---

## 🚀 Quickstart & Setup Instructions

### Option A: Multi-Container Docker Deployment (Recommended)

The easiest way to run the full production stack:

```bash
# 1. Clone the repository
git clone https://github.com/Yonatan996/flowforge.git
cd flowforge

# 2. Copy environment file
cp .env.example .env

# 3. Start all 6 services
docker compose up -d --build
```

#### Services started:
- **Frontend SPA**: [http://localhost:5173](http://localhost:5173)
- **API Documentation (Swagger)**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

#### Useful Docker commands:
```bash
# View live streaming logs
docker compose logs -f

# Inspect container status
docker compose ps

# Stop containers (preserves database & queue volumes)
docker compose down

# Stop and reset volumes
docker compose down -v
```

---

### Option B: Local Development Setup

#### Prerequisites
- Python 3.11+
- Node.js 20+ and npm
- PostgreSQL & Redis (or use SQLite and in-memory queue fallback)

#### 1. Backend Setup
```bash
# 1. Create and activate virtual environment
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Run database migrations
alembic upgrade head

# 4. Start backend API server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Dedicated Worker (Optional in Local Dev)
In standalone local development, the API process automatically runs an in-process worker loop. To test dedicated worker separation:
```bash
python -m backend.app.worker
```

#### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Testing

FlowForge includes an end-to-end automated test suite spanning backend integration tests, SSRF defense validation, race condition tests, frontend component tests, and TypeScript compilation.

### Run Backend Integration Tests (Host)
```bash
.\.venv\Scripts\pytest backend\tests -v
```
**Result**: **31/31 passed (Exit Code: 0)**

### Run In-Container Tests (Live Docker Stack)
```bash
docker compose exec api pytest backend/tests -v
```
**Result**: **31/31 passed in 20.00s (Exit Code: 0)** against real PostgreSQL 16 and Redis 7.

### Run Frontend Unit Tests
```bash
cd frontend
npm test
```
**Result**: **8/8 passed in 1.87s (Exit Code: 0)**

### Run TypeScript & Production Build Verification
```bash
cd frontend
npm run build
```
**Result**: All chunks optimized under 400 kB with custom Rollup code splitting.

### Test Coverage Highlights
- **`test_ssrf.py`**: Validates blocking of private IPs, loopback, cloud metadata (`169.254.169.254`), mixed DNS responses, and DNS rebinding attacks.
- **`test_webhooks.py`**: Verifies payload size enforcement (1 MB limit), content-type checking, idempotency deduplication, and concurrent duplicate deliveries.
- **`test_retries.py`**: Tests exponential backoff, worker crash abandoned execution recovery, and zero double-dispatch across multiple scheduler instances.
- **`test_isolation.py`**: Enforces cross-user resource isolation across workflows, executions, steps, and retries.
- **`test_e2e_journey.py`**: Complete automated user journey from registration $\rightarrow$ workflow creation $\rightarrow$ validation $\rightarrow$ activation $\rightarrow$ webhook execution $\rightarrow$ condition branch $\rightarrow$ retry.

---

## 🔒 Security Architecture

1. **Military-Grade SSRF Defense & Socket Pinning**:
   - Outbound HTTP requests parse and resolve all DNS records prior to connection.
   - Comprehensive IP filtering: blocks RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`), multicast, carrier-grade NAT (`100.64.0.0/10`), IPv4-mapped IPv6 (`::ffff:...`), 6to4 addresses (`2002::/16`), benchmarking (`198.18.0.0/15`), test networks (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), and cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
   - **Mixed DNS response protection**: If any resolved record is private, the entire request is blocked.
   - **Socket-level IP pinning**: Custom `PinnedNetworkBackend` forces the underlying TCP socket to connect strictly to the pre-validated IP address, defeating DNS rebinding windows while preserving TLS SNI and certificate validation.
   - **Dangerous port blocking**: Internal service ports (SSH 22, Redis 6379, Postgres 5432, MySQL 3306, Docker 2375/2376, etc.) are strictly disallowed.
   - User credentials in URLs (`http://user:pass@host`) are rejected.
   - Redirects disabled by default (`ALLOW_REDIRECTS = False`).
   - Response size caps (512 KB max) and request timeouts (10s connect / 5s read).
2. **Credential & Secret Redaction**:
   - Headers containing authentication tokens, keys, passwords, cookies, or secrets are systematically sanitized (`[REDACTED]`) before database persistence or application logging.
3. **Multi-Tenant Ownership Isolation**:
   - Every read, write, execution, schedule, retry, and step log query explicitly enforces `owner_id == current_user.id`.
   - Access attempts to other users' resources return `404 Not Found` to prevent user and resource enumeration.
4. **Password Hashing & Session Protection**:
   - Passwords hashed using Argon2id with 64 MB memory cost and 2 time iterations (RFC 9106).
   - Rate limiting on sensitive endpoints (15 requests/minute per IP) prevents credential brute-forcing.
   - Production secrets validation: Requires $\ge 32$ characters and rejects default development placeholders in production.
   - Session cookies configured with `HttpOnly`, `SameSite=Lax`, and dynamic `Secure=True` in production.
5. **Distributed Coordination & Idempotency**:
   - Webhook idempotency enforced via `(workflow_id, idempotency_key)` database unique constraint, preventing race conditions under concurrent deliveries.
   - Atomic scheduler job claiming (`update ... where next_run_at <= now returning id`) prevents double-dispatching across multiple scheduler instances.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Login and retrieve JWT token | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Yes |
| `POST` | `/api/v1/auth/logout` | Invalidate user session | Yes |
| `GET` | `/api/v1/workflows` | List workflows for current user | Yes |
| `POST` | `/api/v1/workflows` | Create a new workflow (draft) | Yes |
| `GET` | `/api/v1/workflows/{id}` | Retrieve workflow details | Yes |
| `POST` | `/api/v1/workflows/{id}/validate` | Validate workflow definition before activation | Yes |
| `POST` | `/api/v1/workflows/{id}/activate` | Activate workflow | Yes |
| `POST` | `/api/v1/workflows/{id}/deactivate` | Deactivate workflow | Yes |
| `POST` | `/api/v1/workflows/{id}/run` | Trigger manual test execution | Yes |
| `POST` | `/api/v1/workflows/{id}/duplicate` | Duplicate an existing workflow | Yes |
| `DELETE`| `/api/v1/workflows/{id}` | Delete workflow and cascade schedules/executions | Yes |
| `POST` | `/api/v1/webhooks/{token}` | Ingest incoming webhook payload | Webhook Token |
| `GET` | `/api/v1/executions` | List executions with pagination | Yes |
| `GET` | `/api/v1/executions/{id}` | Inspect execution timeline and step logs | Yes |
| `POST` | `/api/v1/executions/{id}/retry` | Retry failed execution from initial trigger state | Yes |
| `GET` | `/api/v1/dashboard/summary` | Retrieve KPI metrics and success rates | Yes |
| `GET` | `/api/v1/dashboard/execution-trends` | 7-day trend analytics for dashboard chart | Yes |
| `GET` | `/health` | Cluster health check (Database + Queue status) | No |

---

## 📄 License

MIT License. Built for portfolio and production automation demonstration.
