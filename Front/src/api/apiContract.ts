export const API_CONTRACT_NOTES = {
  source: 'Backend runtime API + OpenAPI in development',
  scopeRule: 'All idea-related requests must be scoped by spaceId.',
  firstIntegrationSet: [
    'GET /api/spaces/my',
    'GET /api/spaces/{spaceId}/members',
    'GET /api/spaces/{spaceId}/ideas',
    'GET /api/spaces/{spaceId}/ideas/{ideaId}',
    'POST /api/spaces/{spaceId}/ideas',
    'PATCH /api/spaces/{spaceId}/ideas/{ideaId}',
    'POST /api/spaces/{spaceId}/ideas/{ideaId}/archive',
    'POST /api/spaces/{spaceId}/ideas/{ideaId}/restore',
    'GET /api/spaces/{spaceId}/folders',
    'GET /api/spaces/{spaceId}/tags',
    'PATCH /api/spaces/{spaceId}/tags/{tagId}',
    'GET /api/spaces/{spaceId}/categories',
    'PATCH /api/spaces/{spaceId}/categories/{categoryId}',
    'GET /api/spaces/{spaceId}/plan?from={isoDateTime}&to={isoDateTime}',
    'GET /api/spaces/{spaceId}/history',
  ],
  futureReadOptimizedSet: [
    'GET /api/spaces/{spaceId}/overview',
    'GET /api/spaces/{spaceId}/ideas-view',
    'GET /api/spaces/{spaceId}/calendar-view',
    'GET /api/spaces/{spaceId}/history-view',
    'GET /api/spaces/{spaceId}/recommendations-view',
  ],
  enumRule: 'JSON enum values are serialized and accepted as strings.',
  planningRule:
    'Moved is a user action. If backend accepts a future startsAt, the saved plan is returned as Planned. Moved/Canceled without an active future plan makes the idea Active.',
  adapterRule:
    'MVP Front assembles UI models from domain endpoints. Production direction: backend read-optimized DTOs for overview, ideas, calendar, history, recommendations.',
} as const

export const DEFAULT_DEMO_USER_ID = '11111111-1111-1111-1111-111111111111'

export const FUTURE_READ_VIEW_ENDPOINTS = API_CONTRACT_NOTES.futureReadOptimizedSet

export type FutureReadViewEndpoint = (typeof FUTURE_READ_VIEW_ENDPOINTS)[number]

export type ApiSpaceState = 'Active' | 'Archived'
export type ApiIdeaState = 'Inbox' | 'Active' | 'Planned' | 'Experienced' | 'Archived'
export type ApiScheduledIdeaState = 'Planned' | 'Moved' | 'Canceled' | 'Experienced'
export type ApiSpaceKind = 'Personal' | 'Group'
export type ApiMemberRole = 'Admin' | 'Member'
export type ApiTagSource = 'User' | 'System'

export type CreateIdeaRequest = {
  text: string
}

export type UpdateIdeaRequest = {
  text?: string
  title?: string | null
  description?: string | null
  folderId?: string | null
  categoryId?: string | null
  tagIds?: string[]
  state?: ApiIdeaState
  isRecurring?: boolean
}

export type UpdateScheduledIdeaRequest = {
  state?: ApiScheduledIdeaState
  startsAt?: string
  participantIds?: string[]
}

export type UpdateTagRequest = {
  name?: string
  source?: ApiTagSource
}

export type UpdateCategoryRequest = {
  name?: string
}
