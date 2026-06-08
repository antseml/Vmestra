import type { CreateIdeaRequest, UpdateIdeaRequest } from './apiContract'
import type { DataClient } from './dataClient'
import { currentUser, mockApi } from '../mock/vmestraData'

export const mockClient: DataClient = {
  async getCurrentUser() {
    return currentUser
  },
  getSpaces: mockApi.getSpaces,
  async createSpace(request) {
    return mockApi.createSpace(request)
  },
  getSpace: mockApi.getSpace,
  getMembers: mockApi.getMembers,
  getIdeas: mockApi.getSpaceIdeas,
  getIdea: mockApi.getIdea,
  async createIdea(spaceId: string, request: CreateIdeaRequest) {
    return mockApi.createIdea(spaceId, request.text, currentUser.id)
  },
  async updateIdea(spaceId: string, ideaId: string, request: UpdateIdeaRequest) {
    return mockApi.updateIdea(spaceId, ideaId, request)
  },
  async archiveIdea(spaceId: string, ideaId: string) {
    return mockApi.archiveIdea(spaceId, ideaId)
  },
  async restoreIdea(spaceId: string, ideaId: string) {
    return mockApi.restoreIdea(spaceId, ideaId)
  },
  async scheduleIdea(spaceId: string, ideaId: string, request) {
    return mockApi.scheduleIdea(spaceId, ideaId, request)
  },
  async updatePlan(spaceId: string, scheduledIdeaId: string, request) {
    return mockApi.updatePlan(spaceId, scheduledIdeaId, request)
  },
  getFolders: mockApi.getFolders,
  async createFolder(spaceId: string, request) {
    return mockApi.createFolder(spaceId, request)
  },
  getTags: mockApi.getTags,
  async createTag(spaceId: string, request) {
    return mockApi.createTag(spaceId, request)
  },
  getCategories: mockApi.getCategories,
  async createCategory(spaceId: string, request) {
    return mockApi.createCategory(spaceId, request)
  },
  getPlan: mockApi.getPlan,
  getHistory: mockApi.getSpaceHistory,
  createHistoryEntry: mockApi.createHistoryEntry,
  getComments: mockApi.getComments,
  addComment: mockApi.addComment,
  getRecommendations: mockApi.getRecommendations,
}
