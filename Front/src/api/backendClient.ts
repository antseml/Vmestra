import type { ApiIdeaState, ApiScheduledIdeaState, ApiSpaceKind, CreateIdeaRequest } from './apiContract'
import { AuthRequiredError, authClient, getAuthToken, handleUnauthorized } from './authClient'
import type { DataClient } from './dataClient'
import type { CreateNamedItemRequest, CreateSpaceRequest, CreateTagRequest, ScheduleIdeaRequest, UpdateIdeaRequest } from './apiContract'
import type { CreateCommentRequest, CreateHistoryEntryRequest, UpdateScheduledIdeaRequest } from './apiContract'
import type { Comment, Folder, HistoryEntry, Idea, Member, Recommendation, Space, SpaceKind } from '../mock/vmestraData'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

const FALLBACK_SPACE_TITLE = 'Пространство'
const FALLBACK_SPACE_DESCRIPTION = 'Идеи внутри выбранного пространства.'
const FALLBACK_IDEA_TITLE = 'Новая идея'
const FALLBACK_FOLDER = 'Входящие'
const FALLBACK_CATEGORY = 'Идея'
const FALLBACK_HISTORY_TITLE = 'Что уже было'

export class ApiRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

type ApiUser = {
  id: string
  displayName: string
  email?: string | null
}

type ApiSpace = {
  id: string
  kind: ApiSpaceKind
  name: string
  state?: 'Active' | 'Archived'
}

type ApiSpaceMember = {
  id: string
  spaceId: string
  userId: string
  role: Member['role']
  personalSpaceName?: string | null
}

type ApiFolder = {
  id: string
  spaceId: string
  name: string
  sortOrder?: number
}

type ApiTag = {
  id: string
  spaceId: string
  name: string
  source: 'User' | 'System'
}

type ApiCategory = {
  id: string
  spaceId: string
  name: string
}

type ApiIdea = {
  id: string
  spaceId: string
  createdByUserId: string
  text: string
  title?: string | null
  description?: string | null
  folderId?: string | null
  categoryId?: string | null
  tagIds: string[]
  state: ApiIdeaState
  isRecurring: boolean
}

type ApiScheduledIdea = {
  id: string
  spaceId: string
  ideaId: string
  createdByUserId: string
  startsAt: string
  endsAt?: string | null
  participantUserIds: string[]
  state: ApiScheduledIdeaState
  note?: string | null
}

type ApiHistoryEntry = {
  id: string
  spaceId: string
  ideaId?: string | null
  createdByUserId: string
  title?: string | null
  publicNote?: string | null
  note?: string | null
  privateNote?: string | null
  happenedAt: string
}

type ApiComment = {
  id: string
  spaceId: string
  ideaId: string
  createdByUserId: string
  text: string
  createdAt: string
}

type SpaceReferenceData = {
  folders: ApiFolder[]
  tags: ApiTag[]
  categories: ApiCategory[]
}

type IdeaReferenceData = SpaceReferenceData & {
  plan?: ApiScheduledIdea[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (response.status === 401) {
    handleUnauthorized()
    throw new AuthRequiredError()
  }

  if (!response.ok) {
    let message = response.statusText || 'Не удалось выполнить запрос.'
    try {
      const errorBody = (await response.json()) as { message?: string; Message?: string }
      message = errorBody.message ?? errorBody.Message ?? message
    } catch {
      // Some responses, like 403, can be empty.
    }
    throw new ApiRequestError(response.status, message)
  }

  return response.json() as Promise<T>
}

function mapSpaceKind(kind: ApiSpaceKind): SpaceKind {
  return kind === 'Personal' ? 'personal' : 'group'
}

function mapIdeaStatus(state: ApiIdeaState | ApiScheduledIdeaState | undefined): Idea['status'] {
  if (state === 'Inbox') return 'inbox'
  if (state === 'Planned') return 'planned'
  if (state === 'Experienced') return 'memory'
  if (state === 'Archived') return 'archived'
  return 'saved'
}

function userToMember(user: ApiUser, role: Member['role'] = 'Member'): Member {
  return {
    id: user.id,
    name: user.displayName,
    role,
    avatar: user.displayName.slice(0, 1).toUpperCase(),
  }
}

function mapMember(member: ApiSpaceMember, usersById: Map<string, ApiUser>): Member {
  const user = usersById.get(member.userId)
  return {
    id: member.userId,
    name: user?.displayName ?? `РЈС‡Р°СЃС‚РЅРёРє ${member.userId.slice(0, 4)}`,
    role: member.role,
    avatar: user?.displayName.slice(0, 1).toUpperCase() ?? '?',
  }
}

function mapFolder(folder: ApiFolder): Folder {
  return {
    id: folder.id,
    name: folder.name,
    count: 0,
    color: '#7b8fda',
  }
}

function mapSpace(
  space: ApiSpace,
  options?: {
    members?: ApiSpaceMember[]
    usersById?: Map<string, ApiUser>
    ideas?: ApiIdea[]
    history?: ApiHistoryEntry[]
    currentUserId?: string
  },
): Space {
  const ownMember = options?.members?.find((member) => member.userId === options.currentUserId)
  const members = options?.members?.map((member) => mapMember(member, options.usersById ?? new Map())) ?? []
  const ideas = options?.ideas ?? []
  const history = options?.history ?? []

  return {
    id: space.id,
    kind: mapSpaceKind(space.kind),
    title: space.kind === 'Personal' ? (ownMember?.personalSpaceName ?? space.name ?? FALLBACK_SPACE_TITLE) : (space.name ?? FALLBACK_SPACE_TITLE),
    sharedTitle: space.name,
    personalTitle: ownMember?.personalSpaceName ?? undefined,
    description: FALLBACK_SPACE_DESCRIPTION,
    members,
    stats: {
      inbox: ideas.filter((idea) => idea.state === 'Inbox').length,
      ideas: ideas.filter((idea) => idea.state !== 'Archived').length,
      planned: ideas.filter((idea) => idea.state === 'Planned').length,
      memories: history.length,
    },
  }
}

function mapIdea(idea: ApiIdea, refs: IdeaReferenceData): Idea {
  const folder = refs.folders.find((item) => item.id === idea.folderId)
  const category = refs.categories.find((item) => item.id === idea.categoryId)
  const tagsById = new Map(refs.tags.map((tag) => [tag.id, tag.name]))
  const planned = refs.plan?.find((item) => item.ideaId === idea.id && item.state === 'Planned')

  return {
    id: idea.id,
    spaceId: idea.spaceId,
    planId: planned?.id,
    title: idea.title ?? idea.text ?? FALLBACK_IDEA_TITLE,
    note: idea.description ?? '',
    folder: folder?.name ?? FALLBACK_FOLDER,
    category: category?.name ?? FALLBACK_CATEGORY,
    tags: idea.tagIds.map((tagId) => tagsById.get(tagId)).filter((tag): tag is string => Boolean(tag)),
    status: planned ? 'planned' : mapIdeaStatus(idea.state),
    repeatable: idea.isRecurring,
    authorId: idea.createdByUserId,
    plannedFor: planned?.startsAt,
    participants: planned?.participantUserIds ?? [idea.createdByUserId],
  }
}

function mapScheduledIdea(schedule: ApiScheduledIdea, ideasById: Map<string, ApiIdea>, refs: IdeaReferenceData): Idea | null {
  if (schedule.state !== 'Planned') return null

  const idea = ideasById.get(schedule.ideaId)
  if (!idea) return null

  return {
    ...mapIdea(idea, refs),
    planId: schedule.id,
    status: 'planned',
    plannedFor: schedule.startsAt,
    participants: schedule.participantUserIds,
  }
}

function mapHistory(entry: ApiHistoryEntry): HistoryEntry {
  return {
    id: entry.id,
    spaceId: entry.spaceId,
    title: entry.title ?? FALLBACK_HISTORY_TITLE,
    date: entry.happenedAt.slice(0, 10),
    note: entry.publicNote ?? entry.note ?? '',
    privateNote: entry.privateNote ?? undefined,
  }
}

function mapComment(comment: ApiComment): Comment {
  return {
    id: comment.id,
    spaceId: comment.spaceId,
    ideaId: comment.ideaId,
    authorId: comment.createdByUserId,
    text: comment.text,
    createdAt: comment.createdAt,
  }
}

async function getUsersById() {
  const users = await request<ApiUser[]>('/api/users')
  return new Map(users.map((user) => [user.id, user]))
}

async function getSpaceReferenceData(spaceId: string): Promise<SpaceReferenceData> {
  const [folders, tags, categories] = await Promise.all([
    request<ApiFolder[]>(`/api/spaces/${spaceId}/folders`),
    request<ApiTag[]>(`/api/spaces/${spaceId}/tags`),
    request<ApiCategory[]>(`/api/spaces/${spaceId}/categories`),
  ])

  return { folders, tags, categories }
}

async function getScheduledIdeas(spaceId: string, range?: { from?: string; to?: string }) {
  const params = new URLSearchParams()
  if (range?.from) params.set('from', range.from)
  if (range?.to) params.set('to', range.to)
  const suffix = params.size ? `?${params.toString()}` : ''
  return request<ApiScheduledIdea[]>(`/api/spaces/${spaceId}/plan${suffix}`)
}

function buildIdeasPath(spaceId: string, options?: { includeArchived?: boolean }) {
  const params = new URLSearchParams()
  if (options?.includeArchived) params.set('includeArchived', 'true')
  const suffix = params.size ? `?${params.toString()}` : ''
  return `/api/spaces/${spaceId}/ideas${suffix}`
}

async function mapSingleIdea(spaceId: string, idea: ApiIdea) {
  const [refs, plan] = await Promise.all([getSpaceReferenceData(spaceId), getScheduledIdeas(spaceId)])
  return mapIdea(idea, { ...refs, plan })
}

async function mapScheduleUpdate(spaceId: string, schedule: ApiScheduledIdea) {
  const [idea, refs, plan] = await Promise.all([
    request<ApiIdea>(`/api/spaces/${spaceId}/ideas/${schedule.ideaId}`),
    getSpaceReferenceData(spaceId),
    getScheduledIdeas(spaceId),
  ])

  if (schedule.state === 'Planned') {
    return {
      ...mapIdea(idea, { ...refs, plan }),
      planId: schedule.id,
      status: 'planned' as const,
      plannedFor: schedule.startsAt,
      participants: schedule.participantUserIds,
    }
  }

  return mapIdea(idea, { ...refs, plan })
}

async function prepareIdeaUpdate(spaceId: string, requestBody: UpdateIdeaRequest): Promise<UpdateIdeaRequest> {
  if (!('folderName' in requestBody) && !('categoryName' in requestBody) && !('tagNames' in requestBody)) {
    return requestBody
  }

  const refs = await getSpaceReferenceData(spaceId)
  const folderName = requestBody.folderName?.trim()
  const categoryName = requestBody.categoryName?.trim()
  const tagNames = requestBody.tagNames?.map((tag) => tag.trim()).filter(Boolean)
  const { folderName: _folderName, categoryName: _categoryName, tagNames: _tagNames, ...apiRequest } = requestBody
  void _folderName
  void _categoryName
  void _tagNames

  return {
    ...apiRequest,
    folderId: folderName ? (refs.folders.find((folder) => folder.name === folderName)?.id ?? null) : null,
    categoryId: categoryName ? (refs.categories.find((category) => category.name === categoryName)?.id ?? null) : null,
    tagIds: tagNames?.map((tagName) => refs.tags.find((tag) => tag.name === tagName)?.id).filter((id): id is string => Boolean(id)),
  }
}

export const backendClient: DataClient = {
  async getCurrentUser() {
    return userToMember(await authClient.me(), 'Admin')
  },
  async getSpaces() {
    const currentUser = await authClient.me()
    const [spaces, usersById] = await Promise.all([request<ApiSpace[]>('/api/spaces/my'), getUsersById()])

    return Promise.all(
      spaces.map(async (space) => {
        const [members, ideas, history] = await Promise.all([
          request<ApiSpaceMember[]>(`/api/spaces/${space.id}/members`),
          request<ApiIdea[]>(`/api/spaces/${space.id}/ideas`),
          request<ApiHistoryEntry[]>(`/api/spaces/${space.id}/history`),
        ])

        return mapSpace(space, { members, usersById, ideas, history, currentUserId: currentUser.id })
      }),
    )
  },
  async createSpace(requestBody: CreateSpaceRequest) {
    const space = await request<ApiSpace>('/api/spaces', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
    return this.getSpace(space.id)
  },
  async getSpace(spaceId: string) {
    const [space, usersById, members, ideas, history] = await Promise.all([
      request<ApiSpace>(`/api/spaces/${spaceId}`),
      getUsersById(),
      request<ApiSpaceMember[]>(`/api/spaces/${spaceId}/members`),
      request<ApiIdea[]>(`/api/spaces/${spaceId}/ideas`),
      request<ApiHistoryEntry[]>(`/api/spaces/${spaceId}/history`),
    ])

    return mapSpace(space, { members, usersById, ideas, history })
  },
  async getMembers(spaceId: string) {
    const [members, usersById] = await Promise.all([
      request<ApiSpaceMember[]>(`/api/spaces/${spaceId}/members`),
      getUsersById(),
    ])
    return members.map((member) => mapMember(member, usersById))
  },
  async getIdeas(spaceId: string, options) {
    const [ideas, refs, plan] = await Promise.all([
      request<ApiIdea[]>(buildIdeasPath(spaceId, options)),
      getSpaceReferenceData(spaceId),
      getScheduledIdeas(spaceId),
    ])

    return ideas.map((idea) => mapIdea(idea, { ...refs, plan }))
  },
  async getIdea(spaceId: string, ideaId: string) {
    return mapSingleIdea(spaceId, await request<ApiIdea>(`/api/spaces/${spaceId}/ideas/${ideaId}`))
  },
  async createIdea(spaceId: string, requestBody: CreateIdeaRequest) {
    const [createdIdea, refs, plan] = await Promise.all([
      request<ApiIdea>(`/api/spaces/${spaceId}/ideas`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
      getSpaceReferenceData(spaceId),
      getScheduledIdeas(spaceId),
    ])

    return mapIdea(createdIdea, { ...refs, plan })
  },
  async updateIdea(spaceId: string, ideaId: string, requestBody: UpdateIdeaRequest) {
    const apiRequest = await prepareIdeaUpdate(spaceId, requestBody)
    return mapSingleIdea(
      spaceId,
      await request<ApiIdea>(`/api/spaces/${spaceId}/ideas/${ideaId}`, {
        method: 'PATCH',
        body: JSON.stringify(apiRequest),
      }),
    )
  },
  async archiveIdea(spaceId: string, ideaId: string) {
    return mapSingleIdea(
      spaceId,
      await request<ApiIdea>(`/api/spaces/${spaceId}/ideas/${ideaId}/archive`, {
        method: 'POST',
      }),
    )
  },
  async restoreIdea(spaceId: string, ideaId: string) {
    return mapSingleIdea(
      spaceId,
      await request<ApiIdea>(`/api/spaces/${spaceId}/ideas/${ideaId}/restore`, {
        method: 'POST',
      }),
    )
  },
  async scheduleIdea(spaceId: string, ideaId: string, requestBody: ScheduleIdeaRequest) {
    const [schedule, ideas, refs] = await Promise.all([
      request<ApiScheduledIdea>(`/api/spaces/${spaceId}/ideas/${ideaId}/plans`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
      request<ApiIdea[]>(buildIdeasPath(spaceId, { includeArchived: true })),
      getSpaceReferenceData(spaceId),
    ])
    const mappedIdea = mapScheduledIdea(schedule, new Map(ideas.map((idea) => [idea.id, idea])), {
      ...refs,
      plan: [schedule],
    })
    if (!mappedIdea) throw new ApiRequestError(404, 'Не удалось найти запланированную идею.')
    return mappedIdea
  },
  async updatePlan(spaceId: string, scheduledIdeaId: string, requestBody: UpdateScheduledIdeaRequest) {
    return mapScheduleUpdate(
      spaceId,
      await request<ApiScheduledIdea>(`/api/spaces/${spaceId}/plan/${scheduledIdeaId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      }),
    )
  },
  async getFolders(spaceId: string) {
    const [folders, ideas] = await Promise.all([
      request<ApiFolder[]>(`/api/spaces/${spaceId}/folders`),
      request<ApiIdea[]>(`/api/spaces/${spaceId}/ideas`),
    ])

    return folders.map((folder) => ({
      ...mapFolder(folder),
      count: ideas.filter((idea) => idea.folderId === folder.id).length,
    }))
  },
  async createFolder(spaceId: string, requestBody: CreateNamedItemRequest) {
    return mapFolder(
      await request<ApiFolder>(`/api/spaces/${spaceId}/folders`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
    )
  },
  async getTags(spaceId: string) {
    return (await request<ApiTag[]>(`/api/spaces/${spaceId}/tags`)).map((tag) => tag.name)
  },
  async createTag(spaceId: string, requestBody: CreateTagRequest) {
    return (
      await request<ApiTag>(`/api/spaces/${spaceId}/tags`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
    ).name
  },
  async getCategories(spaceId: string) {
    return (await request<ApiCategory[]>(`/api/spaces/${spaceId}/categories`)).map((category) => category.name)
  },
  async createCategory(spaceId: string, requestBody: CreateNamedItemRequest) {
    return (
      await request<ApiCategory>(`/api/spaces/${spaceId}/categories`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
    ).name
  },
  async getPlan(spaceId: string, range) {
    const [schedule, ideas, refs] = await Promise.all([
      getScheduledIdeas(spaceId, range),
      request<ApiIdea[]>(`/api/spaces/${spaceId}/ideas`),
      getSpaceReferenceData(spaceId),
    ])
    const ideasById = new Map(ideas.map((idea) => [idea.id, idea]))

    return schedule
      .map((item) => mapScheduledIdea(item, ideasById, { ...refs, plan: schedule }))
      .filter((idea): idea is Idea => Boolean(idea))
  },
  async getHistory(spaceId: string) {
    return (await request<ApiHistoryEntry[]>(`/api/spaces/${spaceId}/history`)).map(mapHistory)
  },
  async createHistoryEntry(spaceId: string, requestBody: CreateHistoryEntryRequest) {
    return mapHistory(
      await request<ApiHistoryEntry>(`/api/spaces/${spaceId}/history`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
    )
  },
  async getComments(spaceId: string, ideaId: string) {
    return (await request<ApiComment[]>(`/api/spaces/${spaceId}/ideas/${ideaId}/comments`)).map(mapComment)
  },
  async addComment(spaceId: string, ideaId: string, requestBody: CreateCommentRequest) {
    return mapComment(
      await request<ApiComment>(`/api/spaces/${spaceId}/ideas/${ideaId}/comments`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
    )
  },
  async getRecommendations() {
    return [] satisfies Recommendation[]
  },
}
