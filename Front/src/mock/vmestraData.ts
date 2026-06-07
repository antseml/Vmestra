export type SpaceKind = 'personal' | 'group'
export type IdeaStatus = 'inbox' | 'saved' | 'planned' | 'memory' | 'archived'

export type Member = {
  id: string
  name: string
  role: 'Admin' | 'Member'
  avatar: string
}

export type Space = {
  id: string
  kind: SpaceKind
  title: string
  sharedTitle?: string
  personalTitle?: string
  description: string
  members: Member[]
  stats: {
    inbox: number
    ideas: number
    planned: number
    memories: number
  }
}

export type Idea = {
  id: string
  spaceId: string
  title: string
  note: string
  folder: string
  category: string
  tags: string[]
  status: IdeaStatus
  repeatable: boolean
  authorId: string
  plannedFor?: string
  participants: string[]
  similarIdeaIds?: string[]
}

export type Recommendation = {
  id: string
  title: string
  reason: string
  filters: string[]
  ideaIds: string[]
}

export type HistoryEntry = {
  id: string
  spaceId: string
  title: string
  date: string
  note: string
  privateNote?: string
}

export type Folder = {
  id: string
  name: string
  count: number
  color: string
}

const categories = ['Кино', 'Прогулка', 'Кафе', 'Вечер дома', 'Поездка', 'Места', 'Выходные']

const members: Member[] = [
  { id: 'u-alex', name: 'Александра', role: 'Admin', avatar: 'А' },
  { id: 'u-masha', name: 'Маша', role: 'Member', avatar: 'М' },
  { id: 'u-dima', name: 'Дима', role: 'Member', avatar: 'Д' },
  { id: 'u-ira', name: 'Ира', role: 'Member', avatar: 'И' },
]

export const spaces: Space[] = [
  {
    id: 'personal',
    kind: 'personal',
    title: 'Моё пространство',
    description: 'Личные идеи, которые хочется не потерять и спокойно разобрать позже.',
    members: [members[0]],
    stats: { inbox: 4, ideas: 18, planned: 3, memories: 9 },
  },
  {
    id: 'friends',
    kind: 'group',
    title: 'Вечера с друзьями',
    sharedTitle: 'Наша компания',
    personalTitle: 'Вечера с друзьями',
    description: 'Идеи для встреч, коротких поездок, фильмов и совместных ритуалов.',
    members: [members[0], members[1], members[2], members[3]],
    stats: { inbox: 3, ideas: 26, planned: 4, memories: 14 },
  },
  {
    id: 'weekend',
    kind: 'group',
    title: 'Выходные вдвоём',
    sharedTitle: 'Александра и Маша',
    description: 'Небольшие планы без спешки: места, прогулки, еда и домашние вечера.',
    members: [members[0], members[1]],
    stats: { inbox: 1, ideas: 12, planned: 2, memories: 7 },
  },
]

export const folders: Folder[] = [
  { id: 'home', name: 'Дома', count: 8, color: '#7b8fda' },
  { id: 'outside', name: 'Вне дома', count: 11, color: '#4f9f8f' },
  { id: 'food', name: 'Еда', count: 6, color: '#d48955' },
  { id: 'culture', name: 'Культура', count: 9, color: '#b96fa8' },
]

export const ideas: Idea[] = [
  {
    id: 'i-1',
    spaceId: 'friends',
    title: 'Сходить на ночной показ старого фильма',
    note: 'Подойдёт для пятницы, если все хотят спокойно посидеть после недели.',
    folder: 'Культура',
    category: 'Кино',
    tags: ['вечер', 'недорого', 'для компании'],
    status: 'planned',
    repeatable: false,
    authorId: 'u-alex',
    plannedFor: '2026-06-12T20:00:00',
    participants: ['u-alex', 'u-masha', 'u-dima'],
    similarIdeaIds: ['i-8'],
  },
  {
    id: 'i-2',
    spaceId: 'friends',
    title: 'Пикник у воды с настольной игрой',
    note: 'Нужна простая еда, плед и игра без долгих правил.',
    folder: 'Вне дома',
    category: 'Прогулка',
    tags: ['выходные', 'на улице', 'до 3 часов'],
    status: 'saved',
    repeatable: true,
    authorId: 'u-masha',
    participants: ['u-alex', 'u-masha', 'u-dima', 'u-ira'],
  },
  {
    id: 'i-3',
    spaceId: 'friends',
    title: 'Собрать список мест с хорошими завтраками',
    note: 'Потом выбрать одно место утром, когда никто не хочет долго думать.',
    folder: 'Еда',
    category: 'Кафе',
    tags: ['утро', 'недорого', 'вне дома'],
    status: 'inbox',
    repeatable: true,
    authorId: 'u-ira',
    participants: ['u-alex'],
  },
  {
    id: 'i-4',
    spaceId: 'friends',
    title: 'Домашний вечер с обменом плейлистами',
    note: 'Каждый приносит 5 треков и коротко рассказывает, почему они зацепили.',
    folder: 'Дома',
    category: 'Вечер дома',
    tags: ['дома', 'бесплатно', 'личное'],
    status: 'saved',
    repeatable: true,
    authorId: 'u-dima',
    participants: ['u-alex', 'u-dima'],
  },
  {
    id: 'i-5',
    spaceId: 'friends',
    title: 'Мини-поездка в соседний город',
    note: 'Без плотного маршрута: кофе, прогулка, одно место заранее.',
    folder: 'Вне дома',
    category: 'Поездка',
    tags: ['выходные', 'долго', 'для компании'],
    status: 'saved',
    repeatable: false,
    authorId: 'u-alex',
    participants: ['u-alex', 'u-masha', 'u-ira'],
  },
  {
    id: 'i-6',
    spaceId: 'personal',
    title: 'Собрать личный список тихих кафе',
    note: 'Для чтения, работы над идеями и встреч один на один.',
    folder: 'Вне дома',
    category: 'Места',
    tags: ['одной', 'тихо', 'кафе'],
    status: 'saved',
    repeatable: true,
    authorId: 'u-alex',
    participants: ['u-alex'],
  },
  {
    id: 'i-7',
    spaceId: 'weekend',
    title: 'Завтрак дома и длинная прогулка без маршрута',
    note: 'Лёгкий план на воскресенье, когда хочется не перегружать день.',
    folder: 'Дома',
    category: 'Выходные',
    tags: ['вдвоём', 'утро', 'бесплатно'],
    status: 'planned',
    repeatable: true,
    authorId: 'u-alex',
    plannedFor: '2026-06-14T11:00:00',
    participants: ['u-alex', 'u-masha'],
  },
  {
    id: 'i-8',
    spaceId: 'friends',
    title: 'Пересмотреть любимый фильм у кого-нибудь дома',
    note: 'Похожая идея для спокойного вечера, но формат домашний.',
    folder: 'Дома',
    category: 'Кино',
    tags: ['вечер', 'дома', 'для компании'],
    status: 'inbox',
    repeatable: true,
    authorId: 'u-masha',
    participants: ['u-alex', 'u-masha'],
    similarIdeaIds: ['i-1'],
  },
]

export const recommendations: Recommendation[] = [
  {
    id: 'r-evening',
    title: 'На вечер',
    reason: 'Короткие идеи без сложной подготовки.',
    filters: ['вечер', 'до 3 часов', 'недорого'],
    ideaIds: ['i-1', 'i-4', 'i-8'],
  },
  {
    id: 'r-weekend',
    title: 'На выходные',
    reason: 'Когда есть больше времени и можно выбраться из дома.',
    filters: ['выходные', 'вне дома', 'для компании'],
    ideaIds: ['i-2', 'i-5'],
  },
  {
    id: 'r-postponed',
    title: 'Давно откладываем',
    reason: 'Идеи, которые часто всплывали, но пока не были запланированы.',
    filters: ['мягкая подсказка', 'без AI в MVP'],
    ideaIds: ['i-5', 'i-3'],
  },
]

export const history: HistoryEntry[] = [
  {
    id: 'h-1',
    spaceId: 'friends',
    title: 'Сходили на камерный концерт',
    date: '2026-06-02',
    note: 'Хороший формат для буднего вечера: не утомляет и даёт повод встретиться.',
    privateNote: 'Запомнить: лучше брать места ближе к выходу.',
  },
  {
    id: 'h-2',
    spaceId: 'friends',
    title: 'Приготовили ужин по рецепту из сохранённого видео',
    date: '2026-05-28',
    note: 'Идея сработала, потому что подготовка была простой.',
  },
  {
    id: 'h-3',
    spaceId: 'personal',
    title: 'Прогулка с аудиокнигой',
    date: '2026-05-21',
    note: 'Личная история не показывается в группах.',
  },
]

export const currentUser = members[0]

function withActualStats(space: Space): Space {
  const spaceIdeas = ideas.filter((idea) => idea.spaceId === space.id)
  const activeIdeas = spaceIdeas.filter((idea) => idea.status !== 'archived')
  const spaceHistory = history.filter((entry) => entry.spaceId === space.id)

  return {
    ...space,
    stats: {
      inbox: activeIdeas.filter((idea) => idea.status === 'inbox').length,
      ideas: activeIdeas.length,
      planned: activeIdeas.filter((idea) => idea.status === 'planned').length,
      memories: spaceHistory.length,
    },
  }
}

export const mockApi = {
  async getSpaces(userId?: string) {
    void userId
    return spaces.map(withActualStats)
  },
  async getSpace(spaceId: string) {
    return withActualStats(spaces.find((space) => space.id === spaceId) ?? spaces[0])
  },
  async getMembers(spaceId: string) {
    return (spaces.find((space) => space.id === spaceId) ?? spaces[0]).members
  },
  async getSpaceIdeas(spaceId: string, options?: { includeArchived?: boolean }) {
    return ideas.filter((idea) => idea.spaceId === spaceId && (options?.includeArchived || idea.status !== 'archived'))
  },
  async getIdea(spaceId: string, ideaId: string) {
    const idea = ideas.find((item) => item.spaceId === spaceId && item.id === ideaId)
    if (!idea) throw new Error('Idea not found')
    return idea
  },
  async createIdea(spaceId: string, text: string, authorId: string) {
    const newIdea: Idea = {
      id: `i-${Date.now()}`,
      spaceId,
      title: text,
      note: 'Сохранено быстро. Детали можно уточнить позже.',
      folder: 'Входящие',
      category: 'Идея',
      tags: ['входящие', 'потом уточнить'],
      status: 'inbox',
      repeatable: false,
      authorId,
      participants: [authorId],
    }
    ideas.unshift(newIdea)
    return newIdea
  },
  async updateIdea(
    spaceId: string,
    ideaId: string,
    request: {
      text?: string
      title?: string | null
      description?: string | null
      state?: 'Inbox' | 'Active' | 'Planned' | 'Experienced' | 'Archived'
      isRecurring?: boolean
    },
  ) {
    const index = ideas.findIndex((idea) => idea.spaceId === spaceId && idea.id === ideaId)
    if (index < 0) throw new Error('Idea not found')

    const statusByState = {
      Inbox: 'inbox',
      Active: 'saved',
      Planned: 'planned',
      Experienced: 'memory',
      Archived: 'archived',
    } as const
    const currentIdea = ideas[index]
    const updatedIdea: Idea = {
      ...currentIdea,
      title: request.title ?? request.text ?? currentIdea.title,
      note: request.description ?? currentIdea.note,
      status: request.state ? statusByState[request.state] : currentIdea.status,
      repeatable: request.isRecurring ?? currentIdea.repeatable,
    }

    ideas[index] = updatedIdea
    return updatedIdea
  },
  async archiveIdea(spaceId: string, ideaId: string) {
    return this.updateIdea(spaceId, ideaId, { state: 'Archived' })
  },
  async restoreIdea(spaceId: string, ideaId: string) {
    return this.updateIdea(spaceId, ideaId, { state: 'Active' })
  },
  async getFolders(spaceId: string) {
    const spaceIdeas = ideas.filter((idea) => idea.spaceId === spaceId && idea.status !== 'archived')
    return folders.map((folder) => ({
      ...folder,
      count: spaceIdeas.filter((idea) => idea.folder === folder.name).length,
    }))
  },
  async getTags(spaceId: string) {
    return Array.from(new Set(ideas.filter((idea) => idea.spaceId === spaceId).flatMap((idea) => idea.tags)))
  },
  async getCategories(spaceId: string) {
    void spaceId
    return categories
  },
  async getPlan(spaceId: string) {
    return ideas.filter((idea) => idea.spaceId === spaceId && idea.status === 'planned')
  },
  async getSpaceHistory(spaceId: string) {
    return history.filter((entry) => entry.spaceId === spaceId)
  },
  async getRecommendations(spaceId: string) {
    const spaceIdeaIds = new Set(ideas.filter((idea) => idea.spaceId === spaceId).map((idea) => idea.id))
    return recommendations.map((recommendation) => ({
      ...recommendation,
      ideaIds: recommendation.ideaIds.filter((ideaId) => spaceIdeaIds.has(ideaId)),
    }))
  },
}
