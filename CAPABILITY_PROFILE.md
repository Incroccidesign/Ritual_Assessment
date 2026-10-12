# Capability Profile

## Active capabilities

| ID | Source | Required skill/standard | Blocking verification |
| --- | --- | --- | --- |
| authentication-authorisation | Account access and collaboration | secure-development, Supabase security checklist | Role and negative access tests |
| participant-data | Assessment profiling and responses | database-change, data standard | Backward-compatibility and RLS checks |
| public-input | Anonymous assessment links | secure-development | Token isolation and abuse-control tests |
| external-email | Supabase Auth via Resend SMTP | secure-development | Verification/reset delivery test |

## Applicability review

- Payments: not applicable in v1.
- AI: not applicable.

## Human review flags

- privacy-retention-review [advisory] — user-facing disclosure and retention process require product/legal review before broad external launch.
