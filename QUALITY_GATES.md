# Project Quality Gates

| Gate | Severity | Applicability | Command / method |
| --- | --- | --- | --- |
| lint | advisory | applicable | `npm run lint` (currently requires non-interactive configuration repair) |
| typecheck | blocking | applicable | `npx tsc --noEmit` |
| critical-tests | blocking | applicable | focused Playwright/unit coverage for access and public flows |
| build | blocking | applicable | `npm run build` |
| security-scan | blocking | applicable | `npm audit --omit=dev` plus secret exposure review |
| migration-check | blocking | applicable | local backup restore/migration validation and production read-only checks |
| duplication | advisory | not applicable | no configured checker |
| complexity | advisory | not applicable | no configured checker |
| visual-drift | advisory | applicable | focused manual visual review |
