# Vmestra Front

Desktop-first MVP prototype for Vmestra. The app is intentionally built on mock data and keeps the future API boundary isolated in `src/mock/vmestraData.ts`.

## Run

```bash
npm install
npm run dev
```

Local URL:

```text
http://localhost:5173
```

Production check:

```bash
npm run lint
npm run build
```

## Prototype Scope

- Skippable mini onboarding.
- Spaces home screen.
- One-space overview with quick idea capture.
- Inbox for unsorted ideas.
- Folders, tags, and categories.
- Recommendations and collections as MVP-safe mock filters.
- Idea planning with participant selection.
- Calendar view.
- Space history with private-comment placeholder.
- Profile.
- Group creation and member invite UX draft.
- Light and dark modes.
- Three switchable visual directions: calm minimal, warm personal, and dashboard-like overview.

## Product Guardrails

- Ideas from different spaces are never mixed.
- There is no global idea feed.
- Search copy is scoped to the selected space.
- Recommendations are presented as simple MVP filters and mock reasons, not as full AI.
- The interface avoids kanban and task-manager language.
