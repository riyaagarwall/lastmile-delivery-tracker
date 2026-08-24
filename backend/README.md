# Last-Mile Delivery Tracker — Backend

A delivery management platform: customers place orders with auto-calculated
charges, admins configure zones/rate cards and manage agent assignment,
agents update delivery status, and customers get email notifications and a
live tracking timeline.

## Tech stack

- Node.js + Express (REST API)
- MySQL 8.0 (raw SQL via `mysql2`, no ORM)
- JWT auth (`jsonwebtoken`, `bcryptjs`)
- Email notifications via `nodemailer` (any SMTP provider — Gmail app
  password, SendGrid, Resend, etc. Optional: if `SMTP_HOST` is not set,
  emails are skipped with a console log instead of failing the request.)

## Setup

1. **Install MySQL 8.0** locally (or use a free-tier hosted MySQL —
   Railway, Aiven, Clever Cloud all work).

2. **Create the database and run the schema:**
   ```bash
   mysql -u root -p -e "CREATE DATABASE delivery_tracker;"
   mysql -u root -p delivery_tracker < schema.sql
   ```

3. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

4. **Configure environment variables** — copy `.env.example` to `.env` and
   fill in your DB credentials and a JWT secret:
   ```bash
   cp .env.example .env
   ```

5. **Bootstrap the first admin.** No one can self-register as `admin` or
   `agent` through the API (only an existing admin can create those roles) —
   so insert the first admin directly:
   ```bash
   node -e "require('bcryptjs').hash('yourpassword', 10).then(console.log)"
   ```
   Copy the printed hash, then:
   ```sql
   INSERT INTO users (name, email, password_hash, role)
   VALUES ('Admin', 'admin@example.com', '<paste hash here>', 'admin');
   ```

6. **Start the server:**
   ```bash
   node server.js
   ```
   Verify with `curl http://localhost:5000/api/health` → `{"status":"ok"}`.

## Typical setup order (once running)

1. Log in as admin → create zones (`POST /api/zones`)
2. Map pincodes/localities to zones (`POST /api/areas`)
3. Create rate cards for each zone pair × order type (`POST /api/rate-cards`)
4. Register agent accounts (`POST /api/auth/register`, as admin, with
   `role: "agent"`), then create their agent profile (`POST /api/agents`)
   and set them `available`
5. Customers register normally and can now place orders

## Database schema

8 tables — see `schema.sql` for full DDL.

- **users** — all accounts (customer / agent / admin), role-gated.
- **zones** — named delivery zones (e.g. "Zone A").
- **areas** — maps a pincode/locality string to a zone. This is how an
  address gets resolved to a zone at order time.
- **rate_cards** — admin-configured pricing per `(from_zone, to_zone,
  order_type)`. Same zone on both sides = intra-zone rate. Nothing is
  hardcoded — all pricing lives here.
- **agent_profiles** — one per agent user; tracks `current_zone_id` and
  `availability_status` (available / busy / offline), used by
  auto-assignment.
- **orders** — the order record. `current_status` is a denormalized
  convenience column that always mirrors the latest row in
  `status_history` — it is never edited directly outside of that flow.
- **status_history** — append-only log of every status change (status,
  actor role + id, timestamp). This is the immutable tracking history the
  spec requires — rows are never updated or deleted, only inserted.
- **reschedules** — one row per reschedule request on a failed order,
  recording the new delivery date and which agent was reassigned.

## Rate calculation engine (`utils/rateEngine.js`)

1. **Zone detection** — the pickup and drop addresses are looked up
   against the `areas` table (pincode/locality → zone). If an address
   isn't mapped to any zone, order creation fails with a clear 400 error
   telling the admin to add the mapping.
2. **Volumetric weight** = `(L × B × H in cm) ÷ 5000`, rounded to 2
   decimal places.
3. **Billed weight** = `max(actual_weight, volumetric_weight)`.
4. **Rate card lookup** — finds the row in `rate_cards` matching
   `(pickup_zone, drop_zone, order_type)`. If none exists, order creation
   fails with a 400 telling the admin to configure one.
5. **Charge** = `base_rate + (billed_weight × per_kg_rate)`, plus
   `cod_surcharge` if `payment_type === 'COD'`.

`POST /api/orders/quote` runs this exact same calculation without writing
anything to the DB, so the frontend can show the charge before the
customer confirms — the confirmed order then uses the identical function,
so the numbers can never drift between preview and final charge.

## Agent auto-assignment (`utils/assignAgent.js`)

A simple, explainable zone-based proxy for "nearest agent" — finds an
`agent_profiles` row where `current_zone_id` matches the order's pickup
zone and `availability_status = 'available'`. On assignment the agent is
marked `busy`; on `Delivered` or `Failed` they're freed back to
`available`. Manual assignment (`agentId` in the request body) is also
supported and takes priority over auto-assignment.

## Order status lifecycle & failed-delivery flow

Sequence: `Created → Picked Up → In Transit → Out for Delivery →
Delivered`, with `Failed` reachable from any in-progress state
(`Picked Up` / `In Transit` / `Out for Delivery`).

- **Agents** can only move an order to the *next* status in sequence, or to
  `Failed` — any other transition is rejected with a 400 explaining what
  was expected.
- **Admins** can override to any status at any time (per the spec's
  "Admin can... override any order status").
- Every transition — including admin overrides — inserts a new row into
  `status_history` (never updates the old one) and triggers a
  status-change email to the customer.
- On `Failed`, the order stays queryable in its failed state and the
  agent is freed. The customer (or admin) can then call
  `POST /api/orders/:id/reschedule` with a `newDeliveryDate`: this creates
  a `reschedules` row, attempts to auto-assign a fresh agent, and moves
  the order back to `Created` — all while the original `Failed` entry
  remains permanently in `status_history`.

## API reference

All responses: `{ success: true, data: ... }` or `{ success: false, error: "..." }`.
All routes except `/api/health`, `/api/auth/register`, `/api/auth/login`
require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | public | `role` defaults to `customer`; `admin`/`agent` requires an already-authenticated admin |
| POST | `/api/auth/login` | public | returns `{ user, token }` |

### Zones / Areas / Rate cards / Users — admin only
Standard CRUD at `/api/zones`, `/api/areas`, `/api/rate-cards`, `/api/users`
(`POST` / `GET` / `GET :id` / `PUT :id` / `DELETE :id`).

### Agents
| Method | Route | Access |
|---|---|---|
| POST | `/api/agents` | admin |
| GET | `/api/agents`, `/api/agents/:id` | admin (list); admin+agent (single) |
| PUT | `/api/agents/:id` | admin, or the agent themself (zone/availability only) |
| DELETE | `/api/agents/:id` | admin |

### Orders
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/api/orders/quote` | customer, admin | calculates charge, doesn't create the order |
| POST | `/api/orders` | customer, admin | admin may pass `customerId` to create on a customer's behalf |
| GET | `/api/orders` | customer, agent, admin | scoped to own orders for customer/agent; admin sees all, with `?status=&zoneId=&agentId=` filters |
| GET | `/api/orders/:id` | customer, agent, admin (own order only, except admin) | includes full `timeline` and `reschedules` |
| POST | `/api/orders/:id/assign` | admin | pass `{ agentId }` for manual, or `{}` for auto-assign |
| PUT | `/api/orders/:id/status` | agent (own order, sequential), admin (any) | body: `{ status }` |
| POST | `/api/orders/:id/reschedule` | customer, admin | body: `{ newDeliveryDate }`, only on a `Failed` order |

## Notes for evaluators

- No SQL string concatenation anywhere — all queries are parameterized.
- `current_status` on `orders` is always written through the same code
  path that inserts into `status_history`, so the two can't drift apart.
- Rate calculation and agent assignment are isolated in `utils/`
  specifically so they can be reasoned about (and tested) independently
  of the HTTP layer.
