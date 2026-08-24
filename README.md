# Last-Mile Delivery Tracker

A full-stack delivery management platform — customers place orders with
auto-calculated charges, admins manage zones/pricing/agents, agents update
delivery status, and everyone can track an order's full history.

- **Backend**: see `backend/README.md` for setup, API docs, schema, and an
  explanation of the rate calculation engine and auto-assignment logic.
- **Frontend**: React (Vite) SPA in `frontend/` — see below.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev             # local dev server
npm run build            # production build -> frontend/dist
```

## Roles & what each can do

- **Customer**: register, log in, get a rate quote, place an order, view
  their own orders and full tracking timeline, reschedule a failed delivery.
- **Agent**: log in, see orders assigned to them, move a delivery through
  its status sequence (or mark it Failed).
- **Admin**: manage zones, pincode→zone mappings, rate cards, register
  agent accounts and their profiles, view/filter all orders, manually or
  auto-assign agents, and override any order's status.

## Bootstrapping the first admin

No one can self-register as `admin` through the UI or API — see
`backend/README.md` → "Bootstrap the first admin" for the one-time SQL
insert needed to create it.
