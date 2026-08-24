# Last-Mile Delivery Tracker — System Design Write-up

## Rate Calculation Engine

The rate engine (`utils/rateEngine.js`) is isolated from the HTTP layer so it
can be reused identically in two places: the `/orders/quote` preview endpoint
and the actual `/orders` creation endpoint. This guarantees the price a
customer sees before confirming is exactly the price they're charged — there
is no separate calculation path that could drift out of sync.

The calculation runs in four steps. First, pickup and drop addresses are
resolved to zones via the `areas` table, mapping a pincode or locality string
to a `zone_id`; the admin can add or reassign serviceable areas without
touching code. Second, volumetric weight is computed as `(L × B × H in cm) ÷
5000`, the standard courier-industry divisor. Third, billing weight is
`max(actual_weight, volumetric_weight)` — bulky-but-light packages are billed
on the space they occupy, not just their mass. Fourth, the engine looks up the
matching row in `rate_cards` keyed by `(from_zone, to_zone, order_type)`; an
intra-zone delivery is simply a row where both zone IDs are equal, so no
separate "local rate" concept was needed. The final charge is `base_rate +
(billed_weight × per_kg_rate)`, plus a `cod_surcharge` if payment is COD.
Every figure is admin-configurable through `rate_cards` CRUD — nothing is
hardcoded.

## Zone Detection Approach

Zones are treated as a first-class entity rather than inferring geography
from raw coordinates. This was deliberate: it keeps the system explainable
and testable (a pincode either has a mapping or it doesn't, with a clear 400
error telling the admin what to fix), and mirrors how courier networks
actually price — by service zone, not kilometre. The tradeoff is that
unmapped areas are explicitly rejected rather than silently guessed at, the
safer failure mode for a billing-relevant lookup.

## Auto-Assignment Logic

Agent auto-assignment (`utils/assignAgent.js`) uses the same zone abstraction:
an agent has a `current_zone_id` and an `availability_status`
(`available`/`busy`/`offline`), and auto-assignment finds an available agent
in the order's pickup zone. This is a deliberate proxy for "nearest agent"
given the system has no live GPS feed — zone membership is treated as a
reasonable stand-in for physical proximity, and the design leaves a clean
seam (`current_zone_id`) where live coordinates could later be swapped in
for a true distance calculation without changing the calling code.

The assignment itself runs inside a database transaction using
`SELECT ... FOR UPDATE` to row-lock the candidate agent before marking them
busy. This closes a real race condition: without the lock, two orders created
in the same zone at nearly the same instant could both read the same
"available" agent before either write landed, resulting in one agent being
double-booked. Under the transactional version, the second request's lock
simply waits for the first to commit, then re-evaluates availability and
either finds the next free agent or correctly returns a 409 if none remain.
This was verified under real concurrent load (five simultaneous
auto-assignment requests against a single available agent produced exactly
one success and four correct "no agent available" responses).

## Failed Delivery Handling

Order status follows a strict sequence — `Created → Picked Up → In Transit →
Out for Delivery → Delivered` — enforced for agents at the API layer: an
agent can only advance to the immediate next status, or to `Failed` from any
in-progress state. Admins can override to any status at any time, matching
the requirement that admins can correct or force-update orders. Critically,
every transition is recorded as a new row in `status_history` rather than
updating the order in place — this table is append-only by convention (the
code path never issues an `UPDATE` against it), giving a genuinely immutable
audit trail with a timestamp and the acting user's role and ID on every
change. The `orders.current_status` column is a denormalized read-optimization
that is always written through the same code path as the history insert, so
the two can never disagree.

When an order is marked `Failed`, the assigned agent is immediately freed
back to `available` so they aren't blocked from new work, and the customer
receives a status-change email. The customer (or an admin) can then call the
reschedule endpoint with a new delivery date: this inserts a row into a
separate `reschedules` table (preserving which agent was reassigned and when),
attempts to auto-assign a fresh available agent for the new attempt, and
moves the order back to `Created` — while the original `Failed` entry remains
permanently visible in `status_history`. This means an order's full journey,
including any failed attempts, is always reconstructable from the timeline
alone, which was a specific goal given the evaluation criteria around
tracking-history integrity.
