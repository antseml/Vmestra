import {
  Archive,
  CalendarDays,
  FolderOpen,
  History,
  Inbox,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react'
import { useEffect, useRef, useState, type ElementType, type FormEvent } from 'react'
import './App.css'
import { AuthApiError, AuthRequiredError, authClient, setUnauthorizedHandler, type AuthUser } from './api/authClient'
import { ApiRequestError } from './api/backendClient'
import { dataClient, dataSourceLabel, isBackendDataSource } from './api/dataClient'
import { type View } from './appNavigation'
import { AppLayout } from './components/AppLayout'
import { QuickAdd } from './components/QuickAdd'
import { GuidedTour } from './features/guidedTour/GuidedTour'
import { markGuidedTourCompleted, shouldShowGuidedTour, tourSteps } from './features/guidedTour/guidedTourModel'
import {
  type Comment,
  type Folder,
  type HistoryEntry,
  type Idea,
  type Member,
  type Recommendation,
  type Space,
} from './mock/vmestraData'
import { SpacesScreen } from './screens/SpacesScreen'

type IdeaActions = {
  onArchive: (idea: Idea) => void
  onEdit: (idea: Idea, draft: { title: string; note: string; folderName: string; categoryName: string; tagNames: string[] }) => void
  onRestore: (idea: Idea) => void
  onSortOut: (idea: Idea) => void
}

type PlanActions = {
  onCancel: (idea: Idea) => void
  onComplete: (idea: Idea) => void
  onMove: (idea: Idea, startsAt: string, participantUserIds: string[], note?: string) => void
}

type CommentActions = {
  onAddComment: (idea: Idea, text: string) => void
  onOpenComments: (idea: Idea) => void
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError || error instanceof AuthApiError) return error.message
  return fallback
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [activeView, setActiveView] = useState<View>('spaces')
  const [selectedSpaceId, setSelectedSpaceId] = useState('friends')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [quickIdea, setQuickIdea] = useState('')
  const [currentUser, setCurrentUser] = useState<Member | null>(null)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [spaceIdeas, setSpaceIdeas] = useState<Idea[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [spaceHistory, setSpaceHistory] = useState<HistoryEntry[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingIdea, setIsSavingIdea] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [quickAddNotice, setQuickAddNotice] = useState<string | null>(null)
  const [ideaActionNotice, setIdeaActionNotice] = useState<string | null>(null)
  const [planningNotice, setPlanningNotice] = useState<string | null>(null)
  const [dictionaryNotice, setDictionaryNotice] = useState<string | null>(null)
  const [groupNotice, setGroupNotice] = useState<string | null>(null)
  const [commentsByIdeaId, setCommentsByIdeaId] = useState<Record<string, Comment[]>>({})
  const [commentNotice, setCommentNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [authRequired, setAuthRequired] = useState(isBackendDataSource && !authClient.hasToken())

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? spaces[0]
  const inboxIdeas = spaceIdeas.filter((idea) => idea.status === 'inbox')
  const plannedIdeas = spaceIdeas.filter((idea) => idea.status === 'planned')
  const activeLibraryIdeas = spaceIdeas.filter((idea) => idea.status !== 'inbox' && idea.status !== 'archived')
  const archivedIdeas = spaceIdeas.filter((idea) => idea.status === 'archived')
  const selectedSpaceWithLiveStats = selectedSpace
    ? {
        ...selectedSpace,
        stats: {
          inbox: inboxIdeas.length,
          ideas: spaceIdeas.filter((idea) => idea.status !== 'archived').length,
          planned: plannedIdeas.length,
          memories: spaceHistory.length,
        },
      }
    : selectedSpace

  useEffect(() => {
    let isMounted = true

    async function loadSpaces() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const user = await dataClient.getCurrentUser()
        const nextSpaces = await dataClient.getSpaces(isBackendDataSource ? undefined : user.id)

        if (!isMounted) return

        setCurrentUser(user)
        setShowOnboarding(shouldShowGuidedTour(user.id))
        setSpaces(nextSpaces)
        setSelectedSpaceId((currentSpaceId) =>
          nextSpaces.some((space) => space.id === currentSpaceId) ? currentSpaceId : (nextSpaces[0]?.id ?? ''),
        )
      } catch (error) {
        if (!isMounted) return
        if (error instanceof AuthRequiredError) {
          setAuthRequired(true)
          return
        }
        if (error instanceof ApiRequestError && error.status === 403) {
          setLoadError('Недостаточно прав для загрузки пространств.')
          return
        }
        setLoadError('Не удалось загрузить пространства. Проверьте источник данных и попробуйте снова.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadSpaces()

    return () => {
      isMounted = false
    }
  }, [reloadKey])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthRequired(true)
      setCurrentUser(null)
      setSpaces([])
      setSpaceIdeas([])
      setFolders([])
      setCategories([])
      setTags([])
      setSpaceHistory([])
      setCommentsByIdeaId({})
      setRecommendations([])
    })

    return () => setUnauthorizedHandler(undefined)
  }, [])

  useEffect(() => {
    if (!selectedSpace?.id) return

    let isMounted = true

    async function loadSpaceData() {
      setLoadError(null)

      try {
        const [nextIdeas, nextFolders, nextTags, nextCategories, nextPlan, nextHistory, nextRecommendations] = await Promise.all([
          dataClient.getIdeas(selectedSpace.id, { includeArchived: true }),
          dataClient.getFolders(selectedSpace.id),
          dataClient.getTags(selectedSpace.id),
          dataClient.getCategories(selectedSpace.id),
          dataClient.getPlan(selectedSpace.id),
          dataClient.getHistory(selectedSpace.id),
          dataClient.getRecommendations(selectedSpace.id),
        ])

        if (!isMounted) return

        const plannedIds = new Set(nextPlan.map((idea) => idea.id))
        setSpaceIdeas(nextIdeas.map((idea) => (plannedIds.has(idea.id) ? { ...idea, status: 'planned' } : idea)))
        setFolders(nextFolders)
        setTags(nextTags)
        setCategories(nextCategories)
        setSpaceHistory(nextHistory)
        setCommentsByIdeaId({})
        setRecommendations(nextRecommendations)
      } catch (error) {
        if (!isMounted) return
        if (error instanceof AuthRequiredError) {
          setAuthRequired(true)
          return
        }
        if (error instanceof ApiRequestError && error.status === 404) {
          setActiveView('spaces')
          setSpaceIdeas([])
          setFolders([])
          setTags([])
          setCategories([])
          setSpaceHistory([])
          setCommentsByIdeaId({})
          setRecommendations([])
          return
        }
        if (error instanceof ApiRequestError && error.status === 403) {
          setLoadError('Недостаточно прав для этого пространства.')
          return
        }
        setLoadError('Не удалось загрузить данные пространства. Попробуйте обновить экран.')
      }
    }

    void loadSpaceData()

    return () => {
      isMounted = false
    }
  }, [selectedSpace])

  const suggestedTags = tags.slice(0, 5)

  async function saveQuickIdea() {
    if (!selectedSpace?.id || !quickIdea.trim()) return
    setIsSavingIdea(true)
    setQuickAddNotice(null)

    try {
      const newIdea = await dataClient.createIdea(selectedSpace.id, { text: quickIdea.trim() })
      setSpaceIdeas((currentIdeas) => [newIdea, ...currentIdeas])
      setSpaces((currentSpaces) =>
        currentSpaces.map((space) =>
          space.id === selectedSpace.id
            ? {
                ...space,
                stats: {
                  ...space.stats,
                  inbox: newIdea.status === 'inbox' ? space.stats.inbox + 1 : space.stats.inbox,
                  ideas: space.stats.ideas + 1,
                  planned: newIdea.status === 'planned' ? space.stats.planned + 1 : space.stats.planned,
                },
              }
            : space,
        ),
      )
      await refreshHistory(selectedSpace.id)
      setQuickIdea('')
      setQuickAddNotice('Идея сохранена во входящие.')
    } catch {
      setQuickAddNotice('Не удалось сохранить идею. Попробуйте ещё раз.')
    } finally {
      setIsSavingIdea(false)
    }
  }

  function replaceIdea(updatedIdea: Idea) {
    setSpaceIdeas((currentIdeas) =>
      currentIdeas.some((idea) => idea.id === updatedIdea.id)
        ? currentIdeas.map((idea) => (idea.id === updatedIdea.id ? updatedIdea : idea))
        : [updatedIdea, ...currentIdeas],
    )
  }

  async function refreshHistory(spaceId = selectedSpace?.id) {
    if (!spaceId) return
    setSpaceHistory(await dataClient.getHistory(spaceId))
  }

  async function sortOutIdea(idea: Idea) {
    if (!selectedSpace?.id) return
    setIdeaActionNotice(null)

    try {
      replaceIdea(await dataClient.updateIdea(selectedSpace.id, idea.id, { state: 'Active' }))
      await refreshHistory(selectedSpace.id)
      setIdeaActionNotice('Идея перемещена из входящих в копилку.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setIdeaActionNotice('Не удалось разобрать идею. Попробуйте ещё раз.')
    }
  }

  async function saveIdeaEdit(
    idea: Idea,
    draft: { title: string; note: string; folderName: string; categoryName: string; tagNames: string[] },
  ) {
    if (!selectedSpace?.id) return
    setIdeaActionNotice(null)

    try {
      const missingTagNames = draft.tagNames.filter((tagName) => !tags.includes(tagName))
      for (const tagName of missingTagNames) {
        await dataClient.createTag(selectedSpace.id, { name: tagName, source: 'User' })
      }
      if (missingTagNames.length > 0) {
        setTags((currentTags) => Array.from(new Set([...currentTags, ...missingTagNames])))
      }
      replaceIdea(
        await dataClient.updateIdea(selectedSpace.id, idea.id, {
          title: draft.title.trim() || idea.title,
          description: draft.note.trim(),
          folderName: draft.folderName || null,
          categoryName: draft.categoryName || null,
          tagNames: draft.tagNames,
        }),
      )
      await refreshHistory(selectedSpace.id)
      setIdeaActionNotice('Идея обновлена.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setIdeaActionNotice('Не удалось сохранить изменения.')
    }
  }

  async function archiveIdea(idea: Idea) {
    if (!selectedSpace?.id) return
    setIdeaActionNotice(null)

    try {
      replaceIdea(await dataClient.archiveIdea(selectedSpace.id, idea.id))
      await refreshHistory(selectedSpace.id)
      setIdeaActionNotice('Идея отправлена в архив.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setIdeaActionNotice('Не удалось архивировать идею.')
    }
  }

  async function restoreIdea(idea: Idea) {
    if (!selectedSpace?.id) return
    setIdeaActionNotice(null)

    try {
      replaceIdea(await dataClient.restoreIdea(selectedSpace.id, idea.id))
      await refreshHistory(selectedSpace.id)
      setIdeaActionNotice('Идея вернулась в копилку.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setIdeaActionNotice('Не удалось вернуть идею.')
    }
  }

  async function scheduleIdea(ideaId: string, startsAt: string, participantUserIds: string[], note?: string) {
    if (!selectedSpace?.id) return
    setPlanningNotice(null)

    try {
      const plannedIdea = await dataClient.scheduleIdea(selectedSpace.id, ideaId, {
        startsAt,
        participantUserIds,
        note: note?.trim() || null,
      })
      replaceIdea(plannedIdea)
      await refreshHistory(selectedSpace.id)
      setPlanningNotice('Идея добавлена в планы.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setPlanningNotice(getApiErrorMessage(error, 'Не удалось добавить идею в планы.'))
    }
  }

  async function movePlan(idea: Idea, startsAt: string, participantUserIds: string[], note?: string) {
    if (!selectedSpace?.id || !idea.planId) return
    setPlanningNotice(null)

    try {
      const movedIdea = await dataClient.updatePlan(selectedSpace.id, idea.planId, {
        startsAt,
        participantUserIds,
        state: 'Moved',
        note: note?.trim() || null,
      })
      replaceIdea(movedIdea)
      await refreshHistory(selectedSpace.id)
      setPlanningNotice('\u041f\u043b\u0430\u043d \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0451\u043d.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setPlanningNotice(getApiErrorMessage(error, '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0442\u0438 \u043f\u043b\u0430\u043d.'))
    }
  }

  async function cancelPlan(idea: Idea) {
    if (!selectedSpace?.id || !idea.planId) return
    setPlanningNotice(null)

    try {
      const updatedIdea = await dataClient.updatePlan(selectedSpace.id, idea.planId, { state: 'Canceled' })
      replaceIdea(updatedIdea)
      await refreshHistory(selectedSpace.id)
      setPlanningNotice('\u041f\u043b\u0430\u043d \u043e\u0442\u043c\u0435\u043d\u0451\u043d.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setPlanningNotice(getApiErrorMessage(error, '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c \u043f\u043b\u0430\u043d.'))
    }
  }

  async function completePlan(idea: Idea) {
    if (!selectedSpace?.id || !idea.planId) return
    setPlanningNotice(null)

    try {
      const updatedIdea = await dataClient.updatePlan(selectedSpace.id, idea.planId, { state: 'Experienced' })
      replaceIdea(updatedIdea)
      await refreshHistory(selectedSpace.id)
      setPlanningNotice('\u041e\u0442\u043c\u0435\u0447\u0435\u043d\u043e \u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0438.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setPlanningNotice(getApiErrorMessage(error, '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u043a\u0430\u043a \u0441\u043e\u0441\u0442\u043e\u044f\u0432\u0448\u0435\u0435\u0441\u044f.'))
    }
  }

  async function openComments(idea: Idea) {
    if (!selectedSpace?.id) return
    setCommentNotice(null)

    try {
      const comments = await dataClient.getComments(selectedSpace.id, idea.id)
      setCommentsByIdeaId((currentComments) => ({ ...currentComments, [idea.id]: comments }))
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setCommentNotice(getApiErrorMessage(error, 'Не удалось загрузить комментарии.'))
    }
  }

  async function addComment(idea: Idea, text: string) {
    if (!selectedSpace?.id || !text.trim()) return
    setCommentNotice(null)

    try {
      const comment = await dataClient.addComment(selectedSpace.id, idea.id, { text: text.trim() })
      setCommentsByIdeaId((currentComments) => ({
        ...currentComments,
        [idea.id]: [...(currentComments[idea.id] ?? []), comment],
      }))
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setCommentNotice(getApiErrorMessage(error, 'Не удалось добавить комментарий.'))
    }
  }

  async function createGroupSpace(name: string) {
    setGroupNotice(null)

    try {
      const newSpace = await dataClient.createSpace({ name: name.trim(), kind: 'Group' })
      setSpaces((currentSpaces) => [newSpace, ...currentSpaces.filter((space) => space.id !== newSpace.id)])
      setSelectedSpaceId(newSpace.id)
      setSpaceIdeas([])
      setFolders([])
      setTags([])
      setCategories([])
      setSpaceHistory([])
      setRecommendations([])
      setActiveView('space')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setGroupNotice(getApiErrorMessage(error, 'Не удалось создать пространство.'))
    }
  }

  async function createDictionaryItem(kind: 'folder' | 'tag' | 'category', name: string) {
    if (!selectedSpace?.id) return
    const trimmedName = name.trim()
    if (!trimmedName) return
    setDictionaryNotice(null)

    try {
      if (kind === 'folder') {
        const folder = await dataClient.createFolder(selectedSpace.id, { name: trimmedName })
        setFolders((currentFolders) => [...currentFolders, folder])
        setDictionaryNotice('Папка добавлена.')
        return
      }
      if (kind === 'tag') {
        const tag = await dataClient.createTag(selectedSpace.id, { name: trimmedName, source: 'User' })
        setTags((currentTags) => Array.from(new Set([...currentTags, tag])))
        setDictionaryNotice('Тег добавлен.')
        return
      }
      const category = await dataClient.createCategory(selectedSpace.id, { name: trimmedName })
      setCategories((currentCategories) => Array.from(new Set([...currentCategories, category])))
      setDictionaryNotice('Категория добавлена.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setDictionaryNotice(getApiErrorMessage(error, 'Не удалось обновить справочник.'))
    }
  }

  const ideaActions: IdeaActions = {
    onArchive: archiveIdea,
    onEdit: saveIdeaEdit,
    onRestore: restoreIdea,
    onSortOut: sortOutIdea,
  }

  const planActions: PlanActions = {
    onCancel: cancelPlan,
    onComplete: completePlan,
    onMove: movePlan,
  }

  const commentActions: CommentActions = {
    onAddComment: addComment,
    onOpenComments: openComments,
  }

  function completeGuidedTour() {
    markGuidedTourCompleted(currentUser?.id)
    setShowOnboarding(false)
  }

  function continueWithAuth(user: AuthUser) {
    setCurrentUser({
      id: user.id,
      name: user.displayName,
      role: 'Admin',
      avatar: user.displayName.slice(0, 1).toUpperCase(),
    })
    setAuthRequired(false)
    setShowOnboarding(shouldShowGuidedTour(user.id))
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  function logout() {
    authClient.logout()
    setAuthRequired(isBackendDataSource)
    setShowOnboarding(false)
    setCurrentUser(null)
    setSpaces([])
    setSpaceIdeas([])
    setFolders([])
    setTags([])
    setCategories([])
    setSpaceHistory([])
    setRecommendations([])
  }

  if (isLoading) {
    return (
      <main className="app-shell" data-theme={theme}>
        <section className="loading-screen">
          <div className="brand-mark">V</div>
          <h1>Загружаем пространства</h1>
          <p>Источник данных: {dataSourceLabel}</p>
        </section>
      </main>
    )
  }

  if (isBackendDataSource && authRequired) {
    return (
      <main className="app-shell" data-theme={theme}>
        <AuthScreen onAuthenticated={continueWithAuth} />
      </main>
    )
  }

  if (!loadError && currentUser && spaces.length === 0) {
    return (
      <main className="app-shell" data-theme={theme}>
        <NoSpacesScreen currentUser={currentUser} onLogout={logout} />
      </main>
    )
  }

  if (loadError || !selectedSpace || !currentUser) {
    return (
      <main className="app-shell" data-theme={theme}>
        <section className="loading-screen">
          <div className="brand-mark">V</div>
          <h1>Что-то не загрузилось</h1>
          <p>{loadError ?? 'Пока нет доступного пространства.'}</p>
          <button className="primary-button" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Повторить
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <AppLayout
        activeView={activeView}
        currentUser={currentUser}
        selectedSpace={selectedSpaceWithLiveStats}
        onLogout={isBackendDataSource ? logout : undefined}
        setActiveView={setActiveView}
        setTheme={setTheme}
        theme={theme}
      >
        {activeView === 'spaces' && (
          <SpacesScreen
            selectedSpaceId={selectedSpaceId}
            onSelect={(spaceId) => {
              setSelectedSpaceId(spaceId)
              setActiveView('space')
            }}
            onCreateGroup={() => setActiveView('group')}
            spaces={spaces}
          />
        )}

        {activeView === 'space' && (
          <SpaceScreen
            categories={categories}
            folders={folders}
            selectedSpace={selectedSpaceWithLiveStats}
            quickIdea={quickIdea}
            setQuickIdea={setQuickIdea}
            onSaveQuickIdea={saveQuickIdea}
            isSavingIdea={isSavingIdea}
            quickAddNotice={quickAddNotice}
            suggestedTags={suggestedTags}
            inboxIdeas={inboxIdeas}
            plannedIdeas={plannedIdeas}
            spaceIdeas={spaceIdeas}
            ideaActions={ideaActions}
            ideaActionNotice={ideaActionNotice}
            commentActions={commentActions}
            commentNotice={commentNotice}
            commentsByIdeaId={commentsByIdeaId}
            planActions={planActions}
            recommendations={recommendations}
            setActiveView={setActiveView}
            tags={tags}
          />
        )}

        {activeView === 'inbox' && (
          <InboxScreen
            categories={categories}
            folders={folders}
            ideas={inboxIdeas}
            ideaActions={ideaActions}
            ideaActionNotice={ideaActionNotice}
            commentActions={commentActions}
            commentNotice={commentNotice}
            commentsByIdeaId={commentsByIdeaId}
            planActions={planActions}
            tags={tags}
          />
        )}
        {activeView === 'library' && (
          <LibraryScreen
            archivedIdeas={archivedIdeas}
            categories={categories}
            folders={folders}
            ideaActions={ideaActions}
            ideaActionNotice={ideaActionNotice}
            ideas={activeLibraryIdeas}
            commentActions={commentActions}
            commentNotice={commentNotice}
            commentsByIdeaId={commentsByIdeaId}
            planActions={planActions}
            onCreateDictionaryItem={createDictionaryItem}
            tags={tags}
            dictionaryNotice={dictionaryNotice}
          />
        )}
        {activeView === 'recommendations' && (
          <RecommendationsScreen selectedSpace={selectedSpaceWithLiveStats} recommendations={recommendations} />
        )}
        {activeView === 'planning' && (
          <PlanningScreen
            ideaActions={ideaActions}
            commentActions={commentActions}
            commentNotice={commentNotice}
            commentsByIdeaId={commentsByIdeaId}
            onScheduleIdea={scheduleIdea}
            planActions={planActions}
            planningNotice={planningNotice}
            plannedIdeas={plannedIdeas}
            selectedSpace={selectedSpaceWithLiveStats}
            spaceIdeas={spaceIdeas}
          />
        )}
        {activeView === 'calendar' && <CalendarScreen plannedIdeas={plannedIdeas} />}
        {activeView === 'history' && <HistoryScreen entries={spaceHistory} />}
        {activeView === 'profile' && <ProfileScreen currentUser={currentUser} onCreateGroup={() => setActiveView('group')} />}
        {activeView === 'group' && <GroupScreen groupNotice={groupNotice} onCreateGroup={createGroupSpace} />}
      </AppLayout>

      {showOnboarding && (
        <GuidedTour
          activeStep={tourStep}
          onBack={() =>
            setTourStep((step) => {
              const nextStep = Math.max(0, step - 1)
              setActiveView(tourSteps[nextStep].view)
              return nextStep
            })
          }
          onClose={completeGuidedTour}
          onNext={() => {
            if (tourStep >= tourSteps.length - 1) {
              completeGuidedTour()
              return
            }
            setTourStep((step) => {
              const nextStep = step + 1
              setActiveView(tourSteps[nextStep].view)
              return nextStep
            })
          }}
        />
      )}
    </main>
  )
}

function NoSpacesScreen({ currentUser, onLogout }: { currentUser: Member; onLogout: () => void }) {
  return (
    <section className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">{currentUser.avatar}</div>
          <div>
            <strong>{currentUser.name}</strong>
            <span>аккаунт подключён</span>
          </div>
        </div>
        <span className="eyebrow">Пространства</span>
        <h1>Пока нет доступных пространств</h1>
        <p>Когда появится личное или групповое пространство, идеи будут жить внутри него.</p>
        <button className="text-button auth-logout" type="button" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </section>
  )
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response =
        mode === 'login'
          ? await authClient.login({ email, password })
          : await authClient.register({ email, password, displayName })
      onAuthenticated(response.user)
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          mode === 'login' ? 'Не удалось войти. Проверьте email и пароль.' : 'Не удалось создать аккаунт.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>Vmestra</strong>
            <span>войдите, чтобы открыть свои пространства</span>
          </div>
        </div>

        <div className="segmented" aria-label="Авторизация">
          <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>
            Войти
          </button>
          <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>
            Создать аккаунт
          </button>
        </div>

        <form className="auth-form" onSubmit={submitAuth}>
          {mode === 'register' && (
            <label>
              Имя
              <input
                autoComplete="name"
                required
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Пароль
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="form-note auth-error">{error}</p>}
          <p className="form-note">Пароль должен быть не короче 8 символов.</p>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Подождите' : mode === 'login' ? 'Войти' : 'Создать и войти'}
          </button>
        </form>
      </div>
    </section>
  )
}

function SpaceScreen({
  categories,
  folders,
  selectedSpace,
  quickIdea,
  setQuickIdea,
  onSaveQuickIdea,
  isSavingIdea,
  quickAddNotice,
  suggestedTags,
  inboxIdeas,
  plannedIdeas,
  spaceIdeas,
  ideaActions,
  ideaActionNotice,
  commentActions,
  commentNotice,
  commentsByIdeaId,
  planActions,
  recommendations,
  setActiveView,
  tags,
}: {
  categories: string[]
  folders: Folder[]
  selectedSpace: Space
  quickIdea: string
  setQuickIdea: (value: string) => void
  onSaveQuickIdea: () => void
  isSavingIdea: boolean
  quickAddNotice: string | null
  suggestedTags: string[]
  inboxIdeas: Idea[]
  plannedIdeas: Idea[]
  spaceIdeas: Idea[]
  ideaActions: IdeaActions
  ideaActionNotice: string | null
  commentActions: CommentActions
  commentNotice: string | null
  commentsByIdeaId: Record<string, Comment[]>
  planActions: PlanActions
  recommendations: Recommendation[]
  setActiveView: (value: View) => void
  tags: string[]
}) {
  const nonArchivedIdeas = spaceIdeas.filter((idea) => idea.status !== 'archived')
  const recentIdeas = nonArchivedIdeas.slice(0, 5)

  return (
    <div className="space-screen">
      <section className="section-band quick-band" data-tour-id="quick-add">
        <div>
          <span className="eyebrow">{selectedSpace.kind === 'personal' ? 'Личное' : 'Группа'}</span>
          <h2>{selectedSpace.title}</h2>
          <p>{selectedSpace.description}</p>
        </div>
        <QuickAdd
          value={quickIdea}
          onChange={setQuickIdea}
          onSave={onSaveQuickIdea}
          isSaving={isSavingIdea}
          notice={quickAddNotice}
          suggestedTags={suggestedTags}
        />
      </section>

      <section className="metrics-row">
        <Metric icon={Inbox} label="Во входящих" value={inboxIdeas.length} onClick={() => setActiveView('inbox')} />
        <Metric icon={Archive} label="В копилке" value={nonArchivedIdeas.length} onClick={() => setActiveView('library')} />
        <Metric icon={CalendarDays} label="В планах" value={plannedIdeas.length} onClick={() => setActiveView('planning')} />
        <Metric icon={History} label="Историй" value={selectedSpace.stats.memories} onClick={() => setActiveView('history')} />
      </section>

      <div className="screen-grid">
        <section className="section-band main-band">
          <div className="section-title">
            <div>
              <span className="eyebrow">Идеи внутри пространства</span>
              <h2>Недавнее и полезное</h2>
            </div>
            <button className="text-button" type="button" onClick={() => setActiveView('library')}>
              Все папки
            </button>
          </div>
          {ideaActionNotice && <p className="form-note">{ideaActionNotice}</p>}
          <IdeaList
            actions={ideaActions}
            categories={categories}
            commentActions={commentActions}
            commentNotice={commentNotice}
            commentsByIdeaId={commentsByIdeaId}
            folders={folders}
            ideas={recentIdeas}
            planActions={planActions}
            tags={tags}
          />
        </section>

        <aside className="section-band side-band">
          <span className="eyebrow">Мягкие подборки</span>
          <h2>Что можно выбрать</h2>
          <RecommendationCards compact recommendations={recommendations} />
        </aside>
      </div>
    </div>
  )
}

function InboxScreen({
  categories,
  folders,
  ideas,
  ideaActions,
  ideaActionNotice,
  commentActions,
  commentNotice,
  commentsByIdeaId,
  planActions,
  tags,
}: {
  categories: string[]
  folders: Folder[]
  ideas: Idea[]
  ideaActions: IdeaActions
  ideaActionNotice: string | null
  commentActions: CommentActions
  commentNotice: string | null
  commentsByIdeaId: Record<string, Comment[]>
  planActions: PlanActions
  tags: string[]
}) {
  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Сначала сохранить</span>
          <h2>Входящие для неразобранных идей</h2>
        </div>
        <span className="soft-badge">{ideas.length} ждут уточнения</span>
      </div>
      {ideaActionNotice && <p className="form-note">{ideaActionNotice}</p>}
      <IdeaList
        actions={ideaActions}
        categories={categories}
        commentActions={commentActions}
        commentNotice={commentNotice}
        commentsByIdeaId={commentsByIdeaId}
        folders={folders}
        emptyText="Во входящих пока тихо. Новые быстрые идеи будут появляться здесь."
        ideas={ideas}
        planActions={planActions}
        tags={tags}
        inboxMode
      />
    </section>
  )
}

function LibraryScreen({
  archivedIdeas,
  categories,
  dictionaryNotice,
  folders,
  ideaActions,
  ideaActionNotice,
  ideas,
  commentActions,
  commentNotice,
  commentsByIdeaId,
  onCreateDictionaryItem,
  planActions,
  tags,
}: {
  archivedIdeas: Idea[]
  categories: string[]
  dictionaryNotice: string | null
  folders: Folder[]
  ideaActions: IdeaActions
  ideaActionNotice: string | null
  ideas: Idea[]
  commentActions: CommentActions
  commentNotice: string | null
  commentsByIdeaId: Record<string, Comment[]>
  onCreateDictionaryItem: (kind: 'folder' | 'tag' | 'category', name: string) => void
  planActions: PlanActions
  tags: string[]
}) {
  const [showArchived, setShowArchived] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [tagName, setTagName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null)
  const allVisibleIdeas = showArchived ? [...ideas, ...archivedIdeas] : ideas
  const visibleIdeas = selectedFolderName
    ? allVisibleIdeas.filter((idea) => idea.folder === selectedFolderName)
    : allVisibleIdeas
  const folderCounts = new Map<string, number>()
  for (const idea of allVisibleIdeas) {
    folderCounts.set(idea.folder, (folderCounts.get(idea.folder) ?? 0) + 1)
  }

  function submitDictionaryItem(kind: 'folder' | 'tag' | 'category', name: string, reset: () => void) {
    const names = name
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    if (names.length === 0) return
    for (const itemName of names) onCreateDictionaryItem(kind, itemName)
    reset()
  }

  return (
    <div className="screen-grid">
      <section className="section-band main-band">
        <div className="section-title">
          <div>
            <span className="eyebrow">Папки, теги, категории</span>
            <h2>Папки, теги и категории</h2>
          </div>
        </div>
        <div className="folder-grid">
          <button
            className={selectedFolderName === null ? 'folder-tile selected' : 'folder-tile'}
            type="button"
            onClick={() => setSelectedFolderName(null)}
          >
            <span />
            <strong>Все идеи</strong>
            <p>{allVisibleIdeas.length} идей</p>
          </button>
          {folders.map((folder) => (
            <button
              className={selectedFolderName === folder.name ? 'folder-tile selected' : 'folder-tile'}
              key={folder.id}
              type="button"
              onClick={() => setSelectedFolderName(folder.name)}
            >
              <span style={{ background: folder.color }} />
              <strong>{folder.name}</strong>
              <p>{folderCounts.get(folder.name) ?? 0} идей</p>
            </button>
          ))}
        </div>
        <div className="dictionary-create-grid">
          <label>
            Новая папка
            <span>
              <input value={folderName} onChange={(event) => setFolderName(event.target.value)} />
              <button
                className="secondary-button"
                type="button"
                onClick={() => submitDictionaryItem('folder', folderName, () => setFolderName(''))}
              >
                Добавить
              </button>
            </span>
          </label>
          <label>
            Новый тег
            <span>
              <input value={tagName} onChange={(event) => setTagName(event.target.value)} />
              <button
                className="secondary-button"
                type="button"
                onClick={() => submitDictionaryItem('tag', tagName, () => setTagName(''))}
              >
                Добавить
              </button>
            </span>
          </label>
          <label>
            Новая категория
            <span>
              <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
              <button
                className="secondary-button"
                type="button"
                onClick={() => submitDictionaryItem('category', categoryName, () => setCategoryName(''))}
              >
                Добавить
              </button>
            </span>
          </label>
        </div>
        {dictionaryNotice && <p className="form-note">{dictionaryNotice}</p>}
        {folders.length === 0 && <EmptyState text="Создайте папку, чтобы разложить идеи по темам или контекстам." />}
        <div className="archive-toggle">
          <button
            className={showArchived ? 'secondary-button active' : 'secondary-button'}
            type="button"
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived ? 'Скрыть архив' : `Показать архив (${archivedIdeas.length})`}
          </button>
        </div>
        {ideaActionNotice && <p className="form-note">{ideaActionNotice}</p>}
        <IdeaList
          actions={ideaActions}
          categories={categories}
          commentActions={commentActions}
          commentNotice={commentNotice}
          commentsByIdeaId={commentsByIdeaId}
          folders={folders}
          ideas={visibleIdeas}
          planActions={planActions}
          tags={tags}
        />
      </section>

      <aside className="section-band side-band">
        <span className="eyebrow">Теги</span>
        <h2>Быстрые признаки для поиска и выбора</h2>
        <div className="tag-cloud">
          {tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {tags.length === 0 && <EmptyState text="Теги пока не заданы." compact />}
        <span className="eyebrow spacing-top">Категории</span>
        <div className="tag-cloud">
          {categories.map((category) => (
            <span className="tag" key={category}>
              {category}
            </span>
          ))}
        </div>
        {categories.length === 0 && <EmptyState text="Категории пока не заданы." compact />}
      </aside>
    </div>
  )
}

function RecommendationsScreen({
  selectedSpace,
  recommendations,
}: {
  selectedSpace: Space
  recommendations: Recommendation[]
}) {
  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Подборки в «{selectedSpace.title}»</span>
          <h2>Помочь выбрать, а не заставить выполнить</h2>
        </div>
        <span className="soft-badge">по тегам и истории пространства</span>
      </div>
      <RecommendationCards recommendations={recommendations} />
    </section>
  )
}

function buildPlanStartsAt(date: string, time: string) {
  if (!date || !time) return ''
  return new Date(`${date}T${time}:00`).toISOString()
}

function PlanningScreen({
  ideaActions,
  commentActions,
  commentNotice,
  commentsByIdeaId,
  onScheduleIdea,
  planActions,
  planningNotice,
  selectedSpace,
  plannedIdeas,
  spaceIdeas,
}: {
  ideaActions: IdeaActions
  commentActions: CommentActions
  commentNotice: string | null
  commentsByIdeaId: Record<string, Comment[]>
  onScheduleIdea: (ideaId: string, startsAt: string, participantUserIds: string[], note?: string) => void
  planActions: PlanActions
  planningNotice: string | null
  selectedSpace: Space
  plannedIdeas: Idea[]
  spaceIdeas: Idea[]
}) {
  const availableIdeas = spaceIdeas.filter((idea) => idea.status !== 'archived' && idea.status !== 'memory')
  const [selectedIdeaId, setSelectedIdeaId] = useState(plannedIdeas[0]?.id ?? availableIdeas[0]?.id ?? '')
  const [planDate, setPlanDate] = useState('2026-06-12')
  const [planTime, setPlanTime] = useState('20:00')
  const [planNote, setPlanNote] = useState('')
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(() =>
    selectedSpace.members.slice(0, 1).map((member) => member.id),
  )
  const effectiveSelectedIdeaId = availableIdeas.some((idea) => idea.id === selectedIdeaId)
    ? selectedIdeaId
    : (availableIdeas[0]?.id ?? '')
  const startsAt = buildPlanStartsAt(planDate, planTime)
  const draftPlanPayload = {
    ideaId: effectiveSelectedIdeaId,
    startsAt,
    participantUserIds: selectedParticipantIds.length > 0 ? selectedParticipantIds : selectedSpace.members.slice(0, 1).map((member) => member.id),
  }

  function toggleParticipant(memberId: string) {
    setSelectedParticipantIds((currentIds) =>
      currentIds.includes(memberId) ? currentIds.filter((id) => id !== memberId) : [...currentIds, memberId],
    )
  }

  return (
    <div className="screen-grid">
      <section className="section-band main-band">
        <div className="section-title">
          <div>
            <span className="eyebrow">Планирование</span>
            <h2>Дата, время и участники</h2>
          </div>
          <span className="soft-badge">дата, время, участники</span>
        </div>
        <div className="planning-form">
          <label>
            Идея
            <select value={effectiveSelectedIdeaId} onChange={(event) => setSelectedIdeaId(event.target.value)}>
              {availableIdeas.length === 0 ? (
                <option value="">Сначала сохраните идею</option>
              ) : (
                availableIdeas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Дата
            <input value={planDate} type="date" onChange={(event) => setPlanDate(event.target.value)} />
          </label>
          <label>
            Время
            <input value={planTime} type="time" onChange={(event) => setPlanTime(event.target.value)} />
          </label>
          <label>
            Заметка
            <input value={planNote} onChange={(event) => setPlanNote(event.target.value)} placeholder="Необязательно" />
          </label>
          <div>
            <span className="field-label">Участники</span>
            <div className="member-picks">
              {selectedSpace.members.map((member) => (
                <button
                  className={selectedParticipantIds.includes(member.id) ? 'member-chip selected' : 'member-chip'}
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                >
                  <span>{member.avatar}</span>
                  {member.name}
                </button>
              ))}
            </div>
          </div>
          <button
            className="primary-button"
            disabled={!draftPlanPayload.ideaId || !draftPlanPayload.startsAt}
            type="button"
            onClick={() =>
              onScheduleIdea(
                draftPlanPayload.ideaId,
                draftPlanPayload.startsAt,
                draftPlanPayload.participantUserIds,
                planNote,
              )
            }
          >
            Добавить в планы
            <CalendarDays size={17} />
          </button>
          {planningNotice && <p className="form-note">{planningNotice}</p>}
        </div>
      </section>

      <aside className="section-band side-band">
        <span className="eyebrow">Уже в планах</span>
        <IdeaList
          actions={ideaActions}
          categories={[]}
          commentActions={commentActions}
          commentNotice={commentNotice}
          commentsByIdeaId={commentsByIdeaId}
          emptyText="Пока ничего не запланировано. Идеи всё равно остаются доступными в копилке."
          folders={[]}
          ideas={plannedIdeas}
          planActions={planActions}
          tags={[]}
        />
      </aside>
    </div>
  )
}

function CalendarScreen({ plannedIdeas }: { plannedIdeas: Idea[] }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const today = new Date()
  const monday = new Date(today)
  const mondayOffset = (today.getDay() + 6) % 7
  monday.setDate(today.getDate() - mondayOffset)
  monday.setDate(monday.getDate() + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  const weekDays = days.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      date,
      key: date.toISOString().slice(0, 10),
      label,
      title: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    }
  })
  const ideasByDate = new Map<string, Idea[]>()
  for (const idea of plannedIdeas) {
    if (!idea.plannedFor) continue
    const key = new Date(idea.plannedFor).toISOString().slice(0, 10)
    ideasByDate.set(key, [...(ideasByDate.get(key) ?? []), idea])
  }

  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Календарный вид</span>
          <h2>Планы видны, но не доминируют над идеями</h2>
        </div>
        <div className="calendar-controls">
          <button className="secondary-button" type="button" onClick={() => setWeekOffset((value) => value - 1)}>
            Предыдущая
          </button>
          <button className="secondary-button" type="button" onClick={() => setWeekOffset(0)}>
            Эта неделя
          </button>
          <button className="secondary-button" type="button" onClick={() => setWeekOffset((value) => value + 1)}>
            Следующая
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {weekDays.map((day) => (
          <div className="calendar-day" key={day.key}>
            <strong>{day.label}</strong>
            <span>{day.title}</span>
            {(ideasByDate.get(day.key) ?? []).map((idea) => (
              <p key={idea.id}>{idea.title}</p>
            ))}
          </div>
        ))}
      </div>
      {plannedIdeas.length === 0 && <EmptyState text="В календаре пока нет будущих планов." />}
    </section>
  )
}

function HistoryScreen({ entries }: { entries: HistoryEntry[] }) {
  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Память пространства</span>
          <h2>Что уже было</h2>
        </div>
      </div>
      <div className="timeline">
        {entries.length === 0 ? (
          <EmptyState text="Здесь появится память о том, что уже получилось сделать." />
        ) : (
          entries.map((entry) => (
            <article className="timeline-entry" key={entry.id}>
              <time>{entry.date}</time>
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.note}</p>
                {entry.privateNote && <span>Личный комментарий: {entry.privateNote}</span>}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function ProfileScreen({ currentUser, onCreateGroup }: { currentUser: Member; onCreateGroup: () => void }) {
  return (
    <div className="screen-grid">
      <section className="section-band main-band">
        <span className="eyebrow">Профиль</span>
        <div className="profile-head">
          <div className="profile-avatar">{currentUser.avatar}</div>
          <div>
            <h2>{currentUser.name}</h2>
            <p>Первый пользователь. Личное пространство создаётся автоматически.</p>
          </div>
        </div>
        <div className="profile-actions">
          <button className="secondary-button" type="button">
            <UserPlus size={17} />
            Добавить друзей
          </button>
          <button className="secondary-button" type="button" onClick={onCreateGroup}>
            <Users size={17} />
            Создать группу
          </button>
        </div>
      </section>
      <aside className="section-band side-band">
        <span className="eyebrow">Настройки</span>
        <h2>Тема, онбординг, приватность</h2>
        <p>Здесь будет управление профилем, повторный запуск обучения и базовые настройки видимости.</p>
      </aside>
    </div>
  )
}

function GroupScreen({
  groupNotice,
  onCreateGroup,
}: {
  groupNotice: string | null
  onCreateGroup: (name: string) => void
}) {
  const [groupName, setGroupName] = useState('Новая группа')

  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Групповое пространство</span>
          <h2>Создать группу</h2>
        </div>
      </div>
      <div className="group-form">
        <label>
          Название группы
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
        </label>
        <p className="form-note">После создания можно будет добавить участников через приглашения.</p>
        {groupNotice && <p className="form-note">{groupNotice}</p>}
        <button className="primary-button" disabled={!groupName.trim()} type="button" onClick={() => onCreateGroup(groupName)}>
          Создать пространство
          <Users size={17} />
        </button>
      </div>
    </section>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: ElementType
  label: string
  value: number
  onClick: () => void
}) {
  return (
    <button className="metric" type="button" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}

function RecommendationCards({
  compact = false,
  recommendations,
}: {
  compact?: boolean
  recommendations: Recommendation[]
}) {
  return (
    <div className={compact ? 'recommendation-list compact' : 'recommendation-list'}>
      {recommendations.length === 0 ? (
        <EmptyState text="Подборки появятся, когда в пространстве будет больше идей и тегов." />
      ) : (
        recommendations.map((recommendation) => (
          <article className="recommendation-card" key={recommendation.id}>
            <div className="recommendation-icon">
              <Wand2 size={17} />
            </div>
            <div>
              <strong>{recommendation.title}</strong>
              <p>{recommendation.reason}</p>
              <div className="tag-row">
                {recommendation.filters.map((filter) => (
                  <span className="tag" key={filter}>
                    {filter}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  )
}

function IdeaList({
  actions,
  categories,
  commentActions,
  commentNotice,
  commentsByIdeaId,
  folders,
  ideas,
  inboxMode = false,
  emptyText,
  planActions,
  tags,
}: {
  actions?: IdeaActions
  categories: string[]
  commentActions?: CommentActions
  commentNotice?: string | null
  commentsByIdeaId?: Record<string, Comment[]>
  folders: Folder[]
  ideas: Idea[]
  inboxMode?: boolean
  emptyText?: string
  planActions?: PlanActions
  tags: string[]
}) {
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', note: '', folderName: '', categoryName: '', tagNames: [] as string[] })
  const [editTagInput, setEditTagInput] = useState('')
  const [openCommentsIdeaId, setOpenCommentsIdeaId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [movingPlanIdeaId, setMovingPlanIdeaId] = useState<string | null>(null)
  const [moveDate, setMoveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [moveTime, setMoveTime] = useState('20:00')
  const [moveNote, setMoveNote] = useState('')
  const moveDateInputRef = useRef<HTMLInputElement>(null)
  const moveTimeInputRef = useRef<HTMLInputElement>(null)

  function startEditing(idea: Idea) {
    setEditingIdeaId(idea.id)
    setEditDraft({ title: idea.title, note: idea.note, folderName: idea.folder, categoryName: idea.category, tagNames: idea.tags })
    setEditTagInput('')
  }

  function saveEdit(idea: Idea) {
    actions?.onEdit(idea, editDraft)
    setEditingIdeaId(null)
  }

  function addDraftTag() {
    const tagNames = editTagInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    if (tagNames.length === 0) return
    setEditDraft((draft) => ({
      ...draft,
      tagNames: Array.from(new Set([...draft.tagNames, ...tagNames])),
    }))
    setEditTagInput('')
  }

  function removeDraftTag(tagName: string) {
    setEditDraft((draft) => ({ ...draft, tagNames: draft.tagNames.filter((tag) => tag !== tagName) }))
  }

  function openComments(idea: Idea) {
    const nextOpenIdeaId = openCommentsIdeaId === idea.id ? null : idea.id
    setOpenCommentsIdeaId(nextOpenIdeaId)
    if (nextOpenIdeaId) commentActions?.onOpenComments(idea)
  }

  function submitComment(idea: Idea) {
    if (!commentDraft.trim()) return
    commentActions?.onAddComment(idea, commentDraft)
    setCommentDraft('')
  }

  function startMovingPlan(idea: Idea) {
    setMovingPlanIdeaId(idea.id)
    const plannedAt = idea.plannedFor ? new Date(idea.plannedFor) : new Date()
    setMoveDate(plannedAt.toISOString().slice(0, 10))
    setMoveTime(plannedAt.toTimeString().slice(0, 5))
    setMoveNote('')
  }

  function submitMovePlan(idea: Idea) {
    const actualDate = moveDateInputRef.current?.value ?? moveDate
    const actualTime = moveTimeInputRef.current?.value ?? moveTime
    const startsAt = buildPlanStartsAt(actualDate, actualTime)
    if (!startsAt) return
    planActions?.onMove(idea, startsAt, idea.participants, moveNote)
    setMovingPlanIdeaId(null)
  }

  return (
    <div className="idea-list">
      {ideas.length === 0 ? (
        <EmptyState text={emptyText ?? 'Идей пока нет. Быстрое сохранение поможет начать с короткого текста.'} />
      ) : (
        ideas.map((idea) => (
          <article className={idea.status === 'archived' ? 'idea-card archived' : 'idea-card'} key={idea.id}>
            <div>
              <span className="idea-folder">
                <FolderOpen size={14} />
                {idea.folder}
              </span>
              {editingIdeaId === idea.id ? (
                <div className="idea-edit-form">
                  <label>
                    Название
                    <input
                      value={editDraft.title}
                      onChange={(event) => setEditDraft((draft) => ({ ...draft, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    Описание
                    <textarea
                      rows={3}
                      value={editDraft.note}
                      onChange={(event) => setEditDraft((draft) => ({ ...draft, note: event.target.value }))}
                    />
                  </label>
                  <div className="idea-edit-grid">
                    <label>
                      Папка
                      <select
                        value={editDraft.folderName}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, folderName: event.target.value }))}
                      >
                        <option value="">Без папки</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.name}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Категория
                      <select
                        value={editDraft.categoryName}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, categoryName: event.target.value }))}
                      >
                        <option value="">Без категории</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Теги
                    <span className="inline-control">
                      <input
                        list={`tag-options-${idea.id}`}
                        placeholder="Найти или добавить тег, можно несколько через запятую"
                        value={editTagInput}
                        onChange={(event) => setEditTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addDraftTag()
                          }
                        }}
                      />
                      <button className="secondary-button" type="button" onClick={addDraftTag}>
                        Добавить
                      </button>
                    </span>
                    <datalist id={`tag-options-${idea.id}`}>
                      {tags.map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                  </label>
                  <div className="tag-row">
                    {editDraft.tagNames.map((tag) => (
                      <button className="tag removable" key={tag} type="button" onClick={() => removeDraftTag(tag)}>
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="idea-actions">
                    <button className="primary-button" type="button" onClick={() => saveEdit(idea)}>
                      Сохранить
                    </button>
                    <button className="text-button" type="button" onClick={() => setEditingIdeaId(null)}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3>{idea.title}</h3>
                  <p>{idea.note}</p>
                </>
              )}
              <div className="tag-row">
                {idea.category && idea.category !== 'Идея' && <span className="tag category-tag">{idea.category}</span>}
                {idea.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="idea-side">
              <span className="status-pill">
                {idea.status === 'archived'
                  ? 'Архив'
                  : idea.status === 'planned'
                    ? 'Запланировано'
                    : inboxMode
                      ? 'Уточнить'
                      : idea.category}
              </span>
              {idea.similarIdeaIds && <span className="similar-note">есть похожая внутри пространства</span>}
              {actions && (
                <div className="idea-actions compact">
                  {idea.status === 'inbox' && (
                    <button className="text-button" type="button" onClick={() => actions.onSortOut(idea)}>
                      Разобрать
                    </button>
                  )}
                  {idea.status !== 'archived' && (
                    <>
                      <button className="text-button" type="button" onClick={() => startEditing(idea)}>
                        Изменить
                      </button>
                      <button className="text-button" type="button" onClick={() => actions.onArchive(idea)}>
                        Архивировать
                      </button>
                    </>
                  )}
                  {idea.status === 'archived' && (
                    <button className="text-button" type="button" onClick={() => actions.onRestore(idea)}>
                      Вернуть
                    </button>
                  )}
                </div>
              )}
            </div>
            {idea.status === 'planned' && idea.planId && planActions && (
              <div className="plan-card-actions">
                <div>
                  <strong>{idea.plannedFor ? new Date(idea.plannedFor).toLocaleString('ru-RU') : 'Запланировано'}</strong>
                  <span>{idea.participants.length} участн.</span>
                </div>
                {movingPlanIdeaId === idea.id ? (
                  <div className="plan-move-form">
                    <input
                      ref={moveDateInputRef}
                      aria-label="Дата переноса"
                      value={moveDate}
                      type="date"
                      onChange={(event) => setMoveDate(event.target.value)}
                    />
                    <input
                      ref={moveTimeInputRef}
                      aria-label="Время переноса"
                      value={moveTime}
                      type="time"
                      onChange={(event) => setMoveTime(event.target.value)}
                    />
                    <input value={moveNote} placeholder="Причина или заметка" onChange={(event) => setMoveNote(event.target.value)} />
                    <button className="secondary-button" type="button" onClick={() => submitMovePlan(idea)}>
                      Сохранить перенос
                    </button>
                    <button className="text-button" type="button" onClick={() => setMovingPlanIdeaId(null)}>
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div className="idea-actions">
                    <button className="text-button" type="button" onClick={() => startMovingPlan(idea)}>
                      Перенести
                    </button>
                    <button className="text-button" type="button" onClick={() => planActions.onCancel(idea)}>
                      Отменить
                    </button>
                    <button className="text-button" type="button" onClick={() => planActions.onComplete(idea)}>
                      Состоялось
                    </button>
                  </div>
                )}
              </div>
            )}
            {commentActions && (
              <div className="comments-panel">
                <button className="text-button" type="button" onClick={() => openComments(idea)}>
                  {openCommentsIdeaId === idea.id ? 'Скрыть комментарии' : 'Комментарии'}
                </button>
                {openCommentsIdeaId === idea.id && (
                  <div className="comments-box">
                    {(commentsByIdeaId?.[idea.id] ?? []).length === 0 ? (
                      <EmptyState text="Комментариев пока нет." compact />
                    ) : (
                      (commentsByIdeaId?.[idea.id] ?? []).map((comment) => (
                        <div className="comment-row" key={comment.id}>
                          <span>{new Date(comment.createdAt).toLocaleString('ru-RU')}</span>
                          <p>{comment.text}</p>
                        </div>
                      ))
                    )}
                    {commentNotice && <p className="form-note">{commentNotice}</p>}
                    <div className="inline-control">
                      <input
                        aria-label="Добавить комментарий"
                        value={commentDraft}
                        placeholder="Добавить комментарий"
                        onChange={(event) => setCommentDraft(event.target.value)}
                      />
                      <button className="secondary-button" type="button" onClick={() => submitComment(idea)}>
                        Отправить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        ))
      )}
    </div>
  )
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={compact ? 'empty-state compact' : 'empty-state'}>{text}</div>
}

export default App
