# Ritual — Legal and security operating record

Version: 16 September 2026

This is an internal operational record. It is not a substitute for advice from a qualified lawyer or data-protection professional.

## Current service model

- Operator and controller for Ritual account, security and service-operation data: Luca Incrocci (`l.incrocci.design@gmail.com`).
- Service: free, authenticated creation and management of guided assessments.
- Organizers of assessments are controllers for participant-response data. Ritual operates as technical processor for those responses.
- The product does not offer advertising, commercial analytics, behavioural profiling, automated decision-making or an AI system.
- Assessment creators are contractually prohibited from collecting special-category, biometric, criminal-offence or judicial data.

## Current technical safeguards

- Supabase authentication, email confirmation, 12-character password baseline and Cloudflare Turnstile challenge where configured.
- Supabase Row Level Security and server-only secret key for administrative operations.
- Strict Content Security Policy, frame-ancestors/X-Frame-Options, `nosniff`, referrer policy, restrictive permissions policy and HTTPS/HSTS at hosting level.
- Public participant RPCs accept only token-scoped data, validate token shape and restrict response JSON to 64 KiB.
- Legal acceptance uses a dedicated server-written database register; the browser cannot write it directly.

## Providers to review before each material release

The live service depends on Supabase (database and authentication), Vercel (hosting), Resend (transactional email) and Cloudflare Turnstile (anti-abuse). Before a material release, verify the current contractual terms, subprocessors, hosting-region configuration, transfer safeguards and retention schedules in each provider account.

## Incident process

1. Contain: revoke compromised keys/sessions, disable affected functions and preserve relevant technical logs.
2. Assess: identify affected data, people, cause, duration and likely impact.
3. Notify the affected assessment organizer without undue delay where participant data is involved.
4. Decide with the relevant controller whether supervisory-authority or individual notification is required. A controller may need to notify the authority within 72 hours where the GDPR threshold is met.
5. Document the incident, decisions, remedial action and follow-up.

## Items that require human review

- Confirm exact retention periods for operational backups; do not promise a fixed period until provider settings are verified.
- Maintain an up-to-date record of processing activities as the service scales.
- Reassess the need for a DPIA before processing special categories, children’s data, large-scale monitoring, high-risk profiling or similar high-risk processing.
- Obtain tailored legal review before paid plans, enterprise contracts, international deployments or any new purpose involving participant data.
