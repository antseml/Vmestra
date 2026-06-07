import type { CreateIdeaRequest } from './apiContract'
import { backendClient } from './backendClient'
import { mockClient } from './mockClient'
import type { Folder, HistoryEntry, Idea, Member, Recommendation, Space } from '../mock/vmestraData'

export type DataClient = {
  getCurrentUser(): Promise<Member>
  getSpaces(userId?: string): Promise<Space[]>
  getSpace(spaceId: string): Promise<Space>
  getMembers(spaceId: string): Promise<Member[]>
  getIdeas(spaceId: string): Promise<Idea[]>
  createIdea(spaceId: string, request: CreateIdeaRequest): Promise<Idea>
  getFolders(spaceId: string): Promise<Folder[]>
  getTags(spaceId: string): Promise<string[]>
  getCategories(spaceId: string): Promise<string[]>
  getPlan(spaceId: string, range?: { from?: string; to?: string }): Promise<Idea[]>
  getHistory(spaceId: string): Promise<HistoryEntry[]>
  getRecommendations(spaceId: string): Promise<Recommendation[]>
}

export const dataClient: DataClient = import.meta.env.VITE_DATA_SOURCE === 'backend' ? backendClient : mockClient

export const dataSourceLabel = import.meta.env.VITE_DATA_SOURCE === 'backend' ? 'backend API' : 'mock API'

export const isBackendDataSource = import.meta.env.VITE_DATA_SOURCE === 'backend'
