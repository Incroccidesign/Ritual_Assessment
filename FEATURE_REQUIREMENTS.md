# FEATURE_REQUIREMENTS.md

## Feature
**Integration of Live Session into `ritual-assessment-builder`**

## Priority
**HIGH-impact feature delta**

## Goal
Add Live Session to the existing Ritual Assessment platform without changing the established Assessment behavior.

The result must be one Ritual platform with two independently managed participation modes:
- Assessment;
- Live Session.

## Functional requirements

### FR-01 — Shared dashboard
The existing Ritual dashboard must display both Assessment and Live Session items.

Each item must visibly indicate its type.

### FR-02 — Shared creation entry point
The dashboard must expose one `New` entry point.

The creator must be able to choose:
- Assessment;
- Live Session.

Choosing Assessment must preserve the existing Assessment creation flow.

### FR-03 — No Project entity
The feature must not introduce a higher-level `Project` entity.

Assessment and Live Session remain independent first-class items.

### FR-04 — Authenticated Live creator
A Live Session creator/facilitator must be a Ritual user authenticated through the same product authentication system used by Assessment.

### FR-05 — Shared collaboration semantics
Live Sessions must support the same collaboration concepts used by Assessment:
- owner;
- editor;
- co-owner.

Live Sessions must be manageable through the same product-level collaboration experience.

### FR-06 — Public Live participation
Live participants must not require a Ritual account.

The public participation experience must support:

`public link / QR → participant identity → participant token → participation`

### FR-07 — Separate participation behavior
Assessment and Live Session must preserve their different participation behavior:
- Assessment remains asynchronous;
- Live Session remains live and synchronized.

The feature must not require a unified participant/response persistence model.

### FR-08 — Preserve Live setup
The current Live Session creation/setup structure and collected setup information must be preserved with only minimal integration-related adaptation.

### FR-09 — Preserve Live activities
The current Live activity structure and behavior must be preserved, including the existing activity sequence/types used by Facilitation.

### FR-10 — Preserve Live flow
The integrated Live experience must preserve:
- lobby;
- QR/public link;
- participant join;
- facilitator controller;
- participant live interface;
- timer;
- pause/resume;
- live progression;
- Realtime synchronization;
- voting/prioritisation;
- pact/agreement;
- results.

### FR-11 — Preserve Live visual behavior
The current Live-specific visual behavior must be preserved, including dynamic backgrounds, colors, and transitions associated with the Live flow and activities.

### FR-12 — Supabase required
The unified Live Session feature must use Supabase for persistent/multi-device operation.

The current full localStorage backend fallback is not required in the unified product.

### FR-13 — Persistent closed sessions
Closing a Live Session must not remove its data.

A closed session must:
- remain stored;
- remain visible in the dashboard;
- preserve participants, responses, votes, agreements, and results as applicable;
- remain available for later results access.

### FR-14 — Final Live report
The existing Live final reporting/export capability must be integrated.

After a Live Session is completed, its final report must remain downloadable from the dashboard.

### FR-15 — Existing Assessment duplication preserved
The current Assessment duplication behavior must remain available.

### FR-16 — No Live duplication in V1
Live Session duplication must not be implemented in V1.

### FR-17 — Language alignment
Live Session localization must align with the languages that are confirmed as genuinely active and complete in Assessment.

The implementation must not infer product support solely from locale files present in the codebase.

### FR-18 — Preserve current Live UI for V1
V1 must preserve the current Facilitation components and visual system wherever possible.

Only integration-required adaptations are in scope.

A broader UI/design-system unification is deferred.

## Data requirements

### DR-01 — Live data separation
Live Session data must remain logically separate from Assessment data when the underlying semantics differ.

### DR-02 — Participant/response separation
Existing Assessment participant/response concepts must not be repurposed for Live Session data.

### DR-03 — Persistent Live results
Data required to reconstruct completed Live Session results and final reports must remain available after session closure.

### DR-04 — No legacy Facilitation data migration
Historical data from the existing `ritual-facilitation-mvp` backend does not need to be migrated.

Only the required structure and functionality are to be integrated.

## Compatibility requirements

### CR-01 — Assessment is the baseline
`ritual-assessment-builder` is the product baseline.

### CR-02 — Additive change preference
Changes should be additive wherever possible.

Existing Assessment behavior must not be rewritten merely to accommodate Live Session.

### CR-03 — Zero Assessment regressions
The integration must preserve:
- Assessment authentication;
- dashboard access;
- Assessment creation;
- builder;
- public participation;
- results;
- export;
- collaboration;
- duplication.

### CR-04 — Existing Live behavior parity
The integrated Live Session must retain the meaningful functionality already available in `ritual-facilitation-mvp`, except for explicitly excluded behavior.

## Out of scope
- New `Project` entity.
- Assessment → Live data linkage.
- Creating Live Sessions from Assessment results.
- Unified Assessment/Live participant persistence.
- Live Session duplication.
- Migration of legacy Facilitation session data.
- Full UI redesign.
- Full design-system unification.
- Final user-facing naming of the two participation modes.

## Open requirements
### OR-01 — Supported languages
Confirm the exact languages that are actively supported by Assessment before finalizing Live localization scope.

### OR-02 — User-facing terminology
Final naming for the two dashboard/content types will be decided in a later UI/product pass.

Neither open requirement blocks the core integration.

## Acceptance criteria
The feature is acceptable when:

1. Existing Assessment flows continue to operate without functional regression.
2. An authenticated Ritual user can create and manage a Live Session from the same platform.
3. Assessment and Live Session coexist in the same dashboard and are distinguishable.
4. `New` allows choosing between Assessment and Live Session.
5. Live collaboration supports the same owner/editor/co-owner concepts as Assessment.
6. A participant can enter a Live Session through its public link/QR without a Ritual account.
7. The existing Live setup, activities, lobby, controller, participant view, timer, progression, voting, pact, Realtime behavior, and visual transitions remain functionally available.
8. Live data persists in Supabase.
9. Closing a Live Session does not delete the collected session data.
10. A closed Live Session remains accessible from the dashboard.
11. Results remain available after closure.
12. The final Live report can be downloaded from the dashboard after the session.
13. Assessment duplication still works.
14. No Live Session duplication is introduced in V1.
15. The full localStorage backend fallback is no longer required for Live operation.
16. No legacy Facilitation data migration is required.
