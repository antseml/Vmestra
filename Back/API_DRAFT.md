# Vmestra Back API Draft

Storage: in-memory mock data. All idea-related operations are scoped by `spaceId`.

Seed data for local testing:

- demo user: `11111111-1111-1111-1111-111111111111`
- personal space: `22222222-2222-2222-2222-222222222222`
- group space: `33333333-3333-3333-3333-333333333333`

## Service

- `GET /api/health`
- `GET /openapi/v1.json` in Development

## Users

- `GET /api/users`

Users are mocked for now. Auth is not implemented yet.

## Spaces

- `GET /api/spaces?userId={userId}`
- `POST /api/spaces`
- `GET /api/spaces/{spaceId}`
- `PATCH /api/spaces/{spaceId}`
- `POST /api/spaces/{spaceId}/archive`

Space states: `Active`, `Archived`.

Space kinds: `Personal`, `Group`.

## Space Members

- `GET /api/spaces/{spaceId}/members`
- `POST /api/spaces/{spaceId}/members`
- `PATCH /api/spaces/{spaceId}/members/{memberId}`
- `DELETE /api/spaces/{spaceId}/members/{memberId}`

Member roles: `Admin`, `Member`.

## Ideas

- `GET /api/spaces/{spaceId}/ideas`
- `GET /api/spaces/{spaceId}/ideas?folderId={folderId}&tagId={tagId}&categoryId={categoryId}&state={state}&includeArchived=true`
- `POST /api/spaces/{spaceId}/ideas`
- `GET /api/spaces/{spaceId}/ideas/{ideaId}`
- `PATCH /api/spaces/{spaceId}/ideas/{ideaId}`

Idea states: `Inbox`, `Active`, `Planned`, `Experienced`, `Archived`.

Minimal create body:

```json
{
  "text": "Try a new breakfast place"
}
```

## Comments

- `GET /api/spaces/{spaceId}/ideas/{ideaId}/comments`
- `POST /api/spaces/{spaceId}/ideas/{ideaId}/comments`

## Folders, Tags, Categories

- `GET /api/spaces/{spaceId}/folders`
- `POST /api/spaces/{spaceId}/folders`
- `PATCH /api/spaces/{spaceId}/folders/{folderId}`
- `DELETE /api/spaces/{spaceId}/folders/{folderId}`

- `GET /api/spaces/{spaceId}/tags`
- `POST /api/spaces/{spaceId}/tags`
- `DELETE /api/spaces/{spaceId}/tags/{tagId}`

- `GET /api/spaces/{spaceId}/categories`
- `POST /api/spaces/{spaceId}/categories`
- `DELETE /api/spaces/{spaceId}/categories/{categoryId}`

Tag sources: `User`, `System`.

## Planning

- `GET /api/spaces/{spaceId}/plan?from={isoDateTime}&to={isoDateTime}`
- `POST /api/spaces/{spaceId}/ideas/{ideaId}/plans`
- `PATCH /api/spaces/{spaceId}/plan/{scheduledIdeaId}`

Scheduled idea states: `Planned`, `Moved`, `Canceled`, `Experienced`.

## History

- `GET /api/spaces/{spaceId}/history`
- `GET /api/spaces/{spaceId}/history?ideaId={ideaId}`
- `POST /api/spaces/{spaceId}/history`
- `PATCH /api/spaces/{spaceId}/history/{entryId}`

History can be tied to an idea or kept as a general space entry. `privateNote` exists in the model but auth/visibility rules are not implemented yet.

## Out Of MVP

Not implemented in this draft:

- AI or LLM features
- push notifications
- global search
- duplicate search across spaces
- public ideas or social feed
- voting
