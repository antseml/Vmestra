import type { CreateIdeaRequest } from './apiContract'
import type { DataClient } from './dataClient'
import { currentUser, mockApi } from '../mock/vmestraData'

export const mockClient: DataClient = {
  async getCurrentUser() {
    return currentUser
  },
  getSpaces: mockApi.getSpaces,
  getSpace: mockApi.getSpace,
  getMembers: mockApi.getMembers,
  getIdeas: mockApi.getSpaceIdeas,
  async createIdea(spaceId: string, request: CreateIdeaRequest) {
    return mockApi.createIdea(spaceId, request.text, currentUser.id)
  },
  getFolders: mockApi.getFolders,
  getTags: mockApi.getTags,
  getCategories: mockApi.getCategories,
  getPlan: mockApi.getPlan,
  getHistory: mockApi.getSpaceHistory,
  getRecommendations: mockApi.getRecommendations,
}
