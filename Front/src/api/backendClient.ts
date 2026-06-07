import type { ApiIdeaState, ApiScheduledIdeaState, ApiSpaceKind, CreateIdeaRequest } from './apiContract'
import type { DataClient } from './dataClient'
import type { Folder, HistoryEntry, Idea, Member, Recommendation, Space, SpaceKind } from '../mock/vmestraData'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5103'

const FALLBACK_SPACE_TITLE = 'Пространство'
const FALLBACK_SPACE_DESCRIPTION = 'Идеи внутри выбранного пространства.'
const FALLBACK_IDEA_TITLE = 'Новая идея'
const FALLBACK_FOLDER = 'Входящие'
const FALLBACK_CATEGORY = 'Идея'
const FALLBACK_HISTORY_TITLE = 'Что уже было'

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

type SpaceReferenceData = {
  folders: ApiFolder[]
  tags: ApiTag[]
  categories: ApiCategory[]
}

type IdeaReferenceData = SpaceReferenceData & {
  plan?: ApiScheduledIdea[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`)
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
    id: member.id,
    name: user?.displayName ?? `Участник ${member.userId.slice(0, 4)}`,
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
    title: ownMember?.personalSpaceName ?? space.name ?? FALLBACK_SPACE_TITLE,
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

export const backendClient: DataClient = {
  async getCurrentUser() {
    const users = await request<ApiUser[]>('/api/users')
    return userToMember(users[0], 'Admin')
  },
  async getSpaces(userId: string) {
    const [spaces, usersById] = await Promise.all([request<ApiSpace[]>(`/api/spaces?userId=${encodeURIComponent(userId)}`), getUsersById()])

    return Promise.all(
      spaces.map(async (space) => {
        const [members, ideas, history] = await Promise.all([
          request<ApiSpaceMember[]>(`/api/spaces/${space.id}/members`),
          request<ApiIdea[]>(`/api/spaces/${space.id}/ideas`),
          request<ApiHistoryEntry[]>(`/api/spaces/${space.id}/history`),
        ])

        return mapSpace(space, { members, usersById, ideas, history, currentUserId: userId })
      }),
    )
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
  async getIdeas(spaceId: string) {
    const [ideas, refs, plan] = await Promise.all([
      request<ApiIdea[]>(`/api/spaces/${spaceId}/ideas`),
      getSpaceReferenceData(spaceId),
      getScheduledIdeas(spaceId),
    ])

    return ideas.map((idea) => mapIdea(idea, { ...refs, plan }))
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
  async getTags(spaceId: string) {
    return (await request<ApiTag[]>(`/api/spaces/${spaceId}/tags`)).map((tag) => tag.name)
  },
  async getCategories(spaceId: string) {
    return (await request<ApiCategory[]>(`/api/spaces/${spaceId}/categories`)).map((category) => category.name)
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
  async getRecommendations() {
    return [] satisfies Recommendation[]
  },
}
