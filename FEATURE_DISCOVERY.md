# FEATURE_DISCOVERY.md

## Feature
**Live Session integration into `ritual-assessment-builder`**

## Impact classification
**HIGH**

The feature adds a second persistent participation mode with live state, Realtime synchronization, public participant access, collaboration, saved outputs, and dashboard integration. Assessment must remain operational without regressions.

## Objective
Integrate the existing Live Session capability from `ritual-facilitation-mvp` into `ritual-assessment-builder` as an additive feature.

Assessment remains the product baseline. Live Session and Assessment coexist in the same platform and dashboard but remain distinct participation modes.

## Confirmed current-state findings

### Assessment
- Existing application and product baseline.
- Uses Supabase Auth for creator access.
- Uses public token + participant token + RPC for asynchronous participation.
- Existing dashboard, builder, results, export, collaboration, and public participation flows must be preserved.
- Existing Assessment participant/response data model has semantics specific to asynchronous assessments.

### Facilitation
- Existing source of Live Session behavior.
- Includes:
  - session setup;
  - roles;
  - ordered live activities;
  - lobby;
  - QR/public join;
  - facilitator controller;
  - participant live view;
  - timer;
  - pause/resume;
  - live progression;
  - Realtime synchronization;
  - prioritisation/voting;
  - pact/agreement;
  - results;
  - DOCX/XLSX export;
  - dynamic backgrounds, colors, and transitions.
- Current Live participant/response semantics differ from Assessment.
- Current implementation includes a full localStorage fallback that is not required in the unified product.

## Feature delta

### Shared platform behavior
The unified product must add Live Session as a second content type alongside Assessment.

The shared product surface must support:
- one dashboard;
- Assessment cards;
- Live Session cards;
- a single `New` entry point that lets the creator choose which type to create;
- the same account and collaboration concepts for both types.

No higher-level `Project` entity is required.

### Creator and collaboration
Live Session must use the same product-level management concepts as Assessment:
- authenticated Ritual user;
- owner;
- editor;
- co-owner;
- shared dashboard access and collaboration behavior.

### Public participation
The user-facing participation pattern should be coherent across both modes:

`public link / QR → participant identity → participant token → participation`

The underlying participation behavior remains distinct:
- Assessment remains asynchronous;
- Live Session remains synchronized and live.

A unified physical participant/response model is **not** a requirement.

### Live Session persistence
Live Sessions must become persistent first-class content in Ritual.

A completed session must:
- remain stored;
- remain visible in the dashboard;
- preserve collected participant data and results;
- allow later access to results;
- allow later report download.

Closing a session must not automatically delete its operational data.

### Live Session parity
The first integrated version should preserve the current Live Session experience with only minimal adaptation.

Preserve:
- setup structure and information;
- roles;
- activity structure and order;
- live activity behavior;
- lobby;
- QR/public join;
- facilitator view;
- participant view;
- timer;
- pause/resume;
- progression;
- voting/prioritisation;
- pact/agreement;
- Realtime behavior;
- results;
- final report/export;
- dynamic visual system, including background/color changes and transitions.

### Supabase
Supabase is mandatory in the unified version.

The complete localStorage backend fallback from the current Facilitation prototype is not part of the target feature.

### Dashboard and report
Live Sessions must be represented in the same dashboard as Assessments.

The dashboard must support:
- visible distinction between Assessment and Live Session;
- persistent cards for completed Live Sessions;
- access to Live results;
- download of the final Live report from the dashboard.

User-facing terminology for the two modes can be refined later.

### Languages
Facilitation must ultimately align with the languages that are genuinely active and complete in Assessment.

The exact target language set is not yet confirmed. A locale existing in code must not automatically be treated as a product requirement.

### UI
Full visual unification is not part of this feature delta.

For V1:
- preserve current Facilitation components and visual behavior;
- perform only the adaptation required for integration;
- defer broader design-system unification.

## Protected Assessment surface
The following existing Assessment behaviors are invariants:
- creator authentication;
- Assessment creation;
- Assessment builder;
- Assessment public participation;
- Assessment results;
- Assessment export;
- existing Assessment duplication;
- existing Assessment collaboration behavior.

The Live integration must not require a behavioral rewrite of these flows.

## Data separation requirement
Assessment and Live data must remain logically separate where their semantics differ.

In particular, the existing Assessment participant/response concepts must not be repurposed to represent Live participation, because the two systems currently use incompatible meanings and cardinalities.

## Main affected surfaces
- dashboard;
- `New` creation entry point;
- authenticated creator/collaborator access;
- public participant access;
- persistent Live Session data;
- Live activity lifecycle;
- Realtime synchronization;
- results/report access;
- internationalization;
- Live-specific UI and visual behavior.

## Main risks

### HIGH
- Regression of existing Assessment flows.
- Incorrect reuse of Assessment participant/response semantics for Live data.
- Authorization/collaboration mismatch between Assessment and Live Session.
- Public participant access exposing or blocking data incorrectly.
- Loss of existing Live behavior during porting.
- Persistence changes that remove data needed for closed-session results/reporting.

### MEDIUM
- Realtime consistency and reconnection behavior.
- Shared dashboard integration.
- Language alignment.
- Preservation of dynamic Live visual behavior during integration.

## Out of scope for V1
- New `Project` entity.
- Functional coupling between Assessment results and Live Sessions.
- Creating a Live Session from an Assessment.
- Unified participant/response persistence model.
- Live Session duplication.
- Full redesign of Facilitation.
- Full design-system unification.
- Final user-facing naming of the two modes.

## Open points
1. Confirm the exact set of languages that are genuinely active and complete in Assessment before extending Live Session localization.
2. Final user-facing terminology for `Assessment` and `Live Session` will be decided later.

These open points do not block definition of the feature delta.
