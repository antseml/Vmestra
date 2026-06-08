import type {
  CreateNamedItemRequest,
  CreateCommentRequest,
  CreateHistoryEntryRequest,
  CreateIdeaRequest,
  CreateSpaceRequest,
  CreateTagRequest,
  ScheduleIdeaRequest,
  UpdateScheduledIdeaRequest,
  UpdateIdeaRequest,
} from './apiContract'
import { backendClient } from './backendClient'
import { mockClient } from './mockClient'
import type { Comment, Folder, HistoryEntry, Idea, Member, Recommendation, Space } from '../mock/vmestraData'

export type DataClient = {
  getCurrentUser(): Promise<Member>
  getSpaces(userId?: string): Promise<Space[]>
  createSpace(request: CreateSpaceRequest): Promise<Space>
  getSpace(spaceId: string): Promise<Space>
  getMembers(spaceId: string): Promise<Member[]>
  getIdeas(spaceId: string, options?: { includeArchived?: boolean }): Promise<Idea[]>
  getIdea(spaceId: string, ideaId: string): Promise<Idea>
  createIdea(spaceId: string, request: CreateIdeaRequest): Promise<Idea>
  updateIdea(spaceId: string, ideaId: string, request: UpdateIdeaRequest): Promise<Idea>
  archiveIdea(spaceId: string, ideaId: string): Promise<Idea>
  restoreIdea(spaceId: string, ideaId: string): Promise<Idea>
  scheduleIdea(spaceId: string, ideaId: string, request: ScheduleIdeaRequest): Promise<Idea>
  updatePlan(spaceId: string, scheduledIdeaId: string, request: UpdateScheduledIdeaRequest): Promise<Idea>
  getFolders(spaceId: string): Promise<Folder[]>
  createFolder(spaceId: string, request: CreateNamedItemRequest): Promise<Folder>
  getTags(spaceId: string): Promise<string[]>
  createTag(spaceId: string, request: CreateTagRequest): Promise<string>
  getCategories(spaceId: string): Promise<string[]>
  createCategory(spaceId: string, request: CreateNamedItemRequest): Promise<string>
  getPlan(spaceId: string, range?: { from?: string; to?: string }): Promise<Idea[]>
  getHistory(spaceId: string): Promise<HistoryEntry[]>
  createHistoryEntry(spaceId: string, request: CreateHistoryEntryRequest): Promise<HistoryEntry>
  getComments(spaceId: string, ideaId: string): Promise<Comment[]>
  addComment(spaceId: string, ideaId: string, request: CreateCommentRequest): Promise<Comment>
  getRecommendations(spaceId: string): Promise<Recommendation[]>
}

export const dataClient: DataClient = import.meta.env.VITE_DATA_SOURCE === 'backend' ? backendClient : mockClient

export const dataSourceLabel = import.meta.env.VITE_DATA_SOURCE === 'backend' ? 'backend API' : 'mock API'

export const isBackendDataSource = import.meta.env.VITE_DATA_SOURCE === 'backend'
