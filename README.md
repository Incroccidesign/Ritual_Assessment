# Ritual Assessment Builder

A new standalone web app derived from Ritual's visual language, built as a guided visual assessment builder for designers and researchers.

The original Ritual project is not modified. This app starts as a local MVP and keeps the data model ready for Supabase.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## MVP scope

- Create and edit assessments.
- Configure four activity types: Profiling, Exploration, Prioritization and Framing.
- Publish a local public link.
- Run a mobile-friendly participant flow with intro, interaction and summary for each activity.
- Save responses progressively in `localStorage`.
- View a results dashboard.
- Export Excel, DOCX and JSON.
- UI strings are available in English, French and Italian.

## Backend readiness

Supabase table definitions live in `supabase/schema.sql` and follow the assessment model:

- `assessments`
- `activities`
- `participants`
- `responses`
- `activity_responses`

The current UI uses local storage first. Supabase integration can replace `lib/assessment/localStore.ts` with query functions from `lib/supabase`.
