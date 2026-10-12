# Project Discovery

## Product

- Purpose: build, publish, run and analyse participatory Ritual assessments.
- Product type: multilingual web application.
- Target users: assessment owners, shared editors, anonymous participants and a platform administrator.
- Main use cases: create questionnaires, collect anonymous responses via public links, review/export results and collaborate securely with partners.

## Users & Usage

- Access model: authenticated creators; anonymous participants through public assessment links.
- Expected usage: low-volume project and partner collaboration in the current phase.
- Target devices/platforms: responsive browser application.

## Data

- Data handled: assessment structures, participant responses, profiling answers, exports and administrative audit metadata.
- Personal/sensitive data: creator email/password and potentially personal data supplied by participants in assessment questions.
- Files or user-generated content: text responses and generated Excel, Word and JSON exports.

## Capabilities

- Authentication: Supabase email/password; email verification and password recovery are being added.
- Roles/collaboration: owner and shared editor; platform administrator has cross-account oversight.
- Organizations/tenancy: each assessment belongs to the account of its owner; accounts can represent a person or organisation.
- Public input/user-generated content: anonymous participant responses via public link.
- External services: Supabase, Vercel, Cloudflare Turnstile and Resend SMTP.
- AI: none confirmed.
- Payments: none in v1.

## UI Context

- Product surface: dashboard, assessment builder, participant questionnaire and results/export screens.
- Primary interaction model: form-led editing and guided participant activities.
- Platform: Next.js web application with a dark, compact visual language.

## Constraints

- Existing assessment data and current account must be preserved during access-system work.
- Public participant flows remain anonymous and resume only on the same device.
- Production deployment runs on Vercel; persistence and authentication run on Supabase.

## Discovery Status

### CONFIRMED

- Existing assessments were backfilled to one account without altering activities, participants, responses or exports.
- Owners control sharing, revocation, closure and deletion; editors can edit drafts and view/export complete results.
- Published assessments are immutable; returning a published assessment to draft clones it if responses exist.
- SMTP is configured through verified `ritualopen.com` on Resend.

### ASSUMED

- Current scale remains suitable for Supabase Auth and Vercel server routes.

### OPEN

- Legal/privacy review and user-facing retention notice before broad public release.
