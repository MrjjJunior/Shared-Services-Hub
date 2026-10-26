# Slot 1 implementation checklist (archived 2026-10)

Archived from the root `tshepiso_tasks` note. Every item below is implemented
in the current codebase and covered by tests (299 backend tests green at the
time of archiving). Kept as an audit trail; the live tracking happens in the
team's issue tracker (task 447 remains open for the zip-only scope decision).

## Basket 1 — Core loop

### Task state machine and ownership checks

- [x] Define and enforce allowed task transitions: OPEN → IN_PROGRESS → COMPLETED → VERIFIED (rejected work returns to IN_PROGRESS for revision).
- [x] Assign: SME identity from the authenticated request; only the owning SME can assign.
- [x] Complete: youth identity from the authenticated request; only the assigned youth can complete.
- [x] Verify: only the task's owning SME can verify; the assigned youth is explicitly rejected.
- [x] Reject invalid transitions, repeat assignments/completions/verifications, and unauthorized attempts.

### Application and tier eligibility

- [x] Application entity, repository, request/response DTOs, and database mapping.
- [x] Youth apply endpoint with status/duplicate-application behavior.
- [x] Tier eligibility service counting verified experiences only.
- [x] Tier 0 ceiling and 48-hour reservation window with the agreed limits.
- [x] Eligibility enforced on apply and assign.

### Completion, verification, payment, and event

- [x] Valid completion creates exactly one Experience linked to the task and assigned youth.
- [x] Verify requires a rating 1–5, feedback, and a reference (stored on the Experience).
- [x] Valid verification marks both task and Experience VERIFIED.
- [x] Exactly one Payment with total / platform-fee / youth-amount breakdown.
- [x] Verification and payment events published (TaskVerifiedEvent, PaymentPaidEvent).
- [x] Completion and verification transactional.

### Testing and API walkthrough

- [x] Service tests for state transitions, ownership, required verification fields, experience/payment creation, duplicate prevention.
- [x] Tier tests for verified-only counts, Tier 0 limits, reservation-window behavior, apply + assign enforcement.
- [x] Integration coverage for the full flow: apply → assign → complete → verify → Experience + Payment + event.
- [x] Swagger walkthrough documented with authentication and request bodies.

## Basket 2 — Additional scope

- [x] Hash-chained public ledger with verification endpoint (v1/v2 canonical payloads).
- [x] Revise-and-resubmit path for rejected work.
- [x] Funder wallet and sandbox payout (CorporateController impact reporting + admin payout queue).
