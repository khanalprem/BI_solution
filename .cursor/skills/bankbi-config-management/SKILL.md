---
name: bankbi-config-management
description: Configuration management standards for BankBI including access control, threshold settings, data-source health, and audit-safe admin APIs.
---

# BankBI Config Management

Use this skill when implementing system settings, user access, thresholds, or integration configuration.

## Current State

- Configuration dashboard UI exists at `frontend/app/dashboard/config/page.tsx`.
- Current page is a static scaffold and not yet backed by settings APIs.

Treat it as a shell pending backend integration.

## What Config Means in This Project

Priority domains:
- User access and roles
- KPI/alert thresholds
- Data source connection status
- Report scheduling defaults

Each domain should have:
- API endpoint(s)
- persistent storage
- audit trail (who changed what, when)

## API Design Rules

Suggested namespace:
- `/api/v1/configurations/*`

Rules:
- Read endpoints are idempotent (`GET`).
- Changes require explicit payload validation (`PUT`/`PATCH`).
- Return both new config and validation side-effects (for example, immediate breach checks).
- Never return secrets/tokens in API responses.

## Security and Governance

- Require role checks for all write operations.
- Log every config mutation with actor and timestamp.
- Support safe defaults if a config row is missing.
- Keep critical thresholds configurable, not hardcoded in frontend.

## Implementation Sequence

1. Build backend models/tables for one domain at a time.
2. Add API endpoints + validation.
3. Replace static frontend table/cards with hooks.
4. Add optimistic UI only after backend errors are handled cleanly.
5. Add test coverage for permission and validation paths.

## Done Checklist

- Config page reads from API (no hardcoded user list).
- Write actions enforce authorization.
- Each change is auditable.
- Rollback/default behavior is defined for missing config.
