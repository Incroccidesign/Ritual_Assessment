# Project Requirements

## Functional Requirements

- Authenticated users can create and manage assessments they own.
- Owners can share an assessment with an already registered user as an editor and revoke that access.
- Editors can edit draft assessment structures, view complete results/profiling and download Excel, Word and JSON exports.
- Owners and editors can move assessments between draft, published and closed under the approved versioning rules.
- Participants remain anonymous and can access a published, open assessment through its public link.

## Critical User Flows

- Sign up, verify email, sign in and reset password.
- Owner creates an assessment, shares it with a registered editor, publishes/closes it and reviews results.
- Participant completes a public assessment without creating an account.

## Security & Privacy

- Secrets remain server-only and never use `NEXT_PUBLIC_` prefixes.
- Authorisation is enforced at database/server boundaries, not by UI state.
- Existing participant data must not be rewritten or exposed by the access upgrade.
- Platform admin activity uses a minimal audit trail without participant response payloads.
- Public links close immediately when an owner closes an assessment or enters account deletion.

## Reliability

- Existing assessment, participant, response and export workflows remain backward compatible.
- Database changes are versioned, tested against a restored local backup and applied only with explicit production approval.

## Integrations

- Supabase Auth and Postgres.
- Vercel server environment.
- Cloudflare Turnstile for sign-up/login abuse protection.
- Resend SMTP for authentication mail.

## Acceptance Criteria

- A non-owner cannot access or edit an assessment unless assigned as an editor.
- An editor cannot change sharing, ownership or delete an assessment.
- Existing owner access and public participant completion continue to work after deployment.
- No secret is bundled in browser code or committed to Git.

## Decision Status

### CONFIRMED

- Two collaboration roles: owner and shared editor.
- Account state includes pending verification, active, suspended, deletion requested and deleted.
- Deletion recovery lasts 30 days; default retention is 24 months after assessment closure, with platform-admin exception handling.

### ASSUMED

- Shared login remains temporarily acceptable to the account owner; invitation emails are out of scope for v1.

### OPEN

- Formal retention/deletion job implementation and administrative UI are later phases.
