import {
  Archive,
  CalendarDays,
  FolderOpen,
  History,
  Inbox,
  Plus,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ElementType, type FormEvent } from 'react'
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
  onEdit: (idea: Idea, draft: { title: string; note: string }) => void
  onRestore: (idea: Idea) => void
  onSortOut: (idea: Idea) => void
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

  const suggestedTags = useMemo(() => {
    const text = quickIdea.toLowerCase()
    if (text.includes('кино') || text.includes('фильм')) return ['вечер', 'кино', 'дома']
    if (text.includes('кафе') || text.includes('завтрак')) return ['еда', 'утро', 'вне дома']
    if (text.includes('гулять') || text.includes('прогул')) return ['вне дома', 'бесплатно']
    return ['входящие', 'потом уточнить']
  }, [quickIdea])

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

  async function sortOutIdea(idea: Idea) {
    if (!selectedSpace?.id) return
    setIdeaActionNotice(null)

    try {
      replaceIdea(await dataClient.updateIdea(selectedSpace.id, idea.id, { state: 'Active' }))
      setIdeaActionNotice('Идея перемещена из входящих в копилку.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setIdeaActionNotice('Не удалось разобрать идею. Попробуйте ещё раз.')
    }
  }

  async function saveIdeaEdit(idea: Idea, draft: { title: string; note: string }) {
    if (!selectedSpace?.id) return
    setIdeaActionNotice(null)

    try {
      replaceIdea(
        await dataClient.updateIdea(selectedSpace.id, idea.id, {
          title: draft.title.trim() || idea.title,
          description: draft.note.trim(),
        }),
      )
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
      setPlanningNotice('Идея добавлена в планы.')
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true)
        return
      }
      setPlanningNotice(getApiErrorMessage(error, 'Не удалось добавить идею в планы.'))
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
            recommendations={recommendations}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'inbox' && (
          <InboxScreen ideas={inboxIdeas} ideaActions={ideaActions} ideaActionNotice={ideaActionNotice} />
        )}
        {activeView === 'library' && (
          <LibraryScreen
            archivedIdeas={archivedIdeas}
            categories={categories}
            folders={folders}
            ideaActions={ideaActions}
            ideaActionNotice={ideaActionNotice}
            ideas={activeLibraryIdeas}
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
            onScheduleIdea={scheduleIdea}
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
  recommendations,
  setActiveView,
}: {
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
  recommendations: Recommendation[]
  setActiveView: (value: View) => void
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
          <IdeaList actions={ideaActions} ideas={recentIdeas} />
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
  ideas,
  ideaActions,
  ideaActionNotice,
}: {
  ideas: Idea[]
  ideaActions: IdeaActions
  ideaActionNotice: string | null
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
        emptyText="Во входящих пока тихо. Новые быстрые идеи будут появляться здесь."
        ideas={ideas}
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
  onCreateDictionaryItem,
  tags,
}: {
  archivedIdeas: Idea[]
  categories: string[]
  dictionaryNotice: string | null
  folders: Folder[]
  ideaActions: IdeaActions
  ideaActionNotice: string | null
  ideas: Idea[]
  onCreateDictionaryItem: (kind: 'folder' | 'tag' | 'category', name: string) => void
  tags: string[]
}) {
  const [showArchived, setShowArchived] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [tagName, setTagName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const visibleIdeas = showArchived ? [...ideas, ...archivedIdeas] : ideas

  function submitDictionaryItem(kind: 'folder' | 'tag' | 'category', name: string, reset: () => void) {
    if (!name.trim()) return
    onCreateDictionaryItem(kind, name)
    reset()
  }

  return (
    <div className="screen-grid">
      <section className="section-band main-band">
        <div className="section-title">
          <div>
            <span className="eyebrow">Папки, теги, категории</span>
            <h2>Копилка без жёсткой рабочей структуры</h2>
          </div>
        </div>
        <div className="folder-grid">
          {folders.map((folder) => (
            <div className="folder-tile" key={folder.id}>
              <span style={{ background: folder.color }} />
              <strong>{folder.name}</strong>
              <p>{folder.count} идей</p>
            </div>
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
        {folders.length === 0 && <EmptyState text="Папки появятся здесь, когда в пространстве будет первый справочник." />}
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
        <IdeaList actions={ideaActions} ideas={visibleIdeas} />
      </section>

      <aside className="section-band side-band">
        <span className="eyebrow">Теги</span>
        <h2>Сервис может предложить, пользователь может поправить</h2>
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
        <span className="soft-badge">простые фильтры MVP</span>
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
  onScheduleIdea,
  planningNotice,
  selectedSpace,
  plannedIdeas,
  spaceIdeas,
}: {
  ideaActions: IdeaActions
  onScheduleIdea: (ideaId: string, startsAt: string, participantUserIds: string[], note?: string) => void
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
  const effectiveSelectedIdeaId = availableIdeas.some((idea) => idea.id === selectedIdeaId)
    ? selectedIdeaId
    : (availableIdeas[0]?.id ?? '')
  const startsAt = buildPlanStartsAt(planDate, planTime)
  const draftPlanPayload = {
    ideaId: effectiveSelectedIdeaId,
    startsAt,
    participantUserIds: selectedSpace.members.map((member) => member.id),
  }

  return (
    <div className="screen-grid">
      <section className="section-band main-band">
        <div className="section-title">
          <div>
            <span className="eyebrow">Планирование идеи</span>
            <h2>Дата, время и участники</h2>
          </div>
          <span className="soft-badge">заготовка UX</span>
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
                <button className="member-chip" key={member.id} type="button">
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
          emptyText="Пока ничего не запланировано. Идеи всё равно остаются доступными в копилке."
          ideas={plannedIdeas}
        />
      </aside>
    </div>
  )
}

function CalendarScreen({ plannedIdeas }: { plannedIdeas: Idea[] }) {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Календарный вид</span>
          <h2>Планы видны, но не доминируют над идеями</h2>
        </div>
      </div>
      <div className="calendar-grid">
        {days.map((day, index) => (
          <div className="calendar-day" key={day}>
            <strong>{day}</strong>
            <span>{8 + index} июня</span>
            {plannedIdeas[index % Math.max(plannedIdeas.length, 1)] && (
              <p>{plannedIdeas[index % plannedIdeas.length].title}</p>
            )}
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
  const [personalName, setPersonalName] = useState('')
  const [inviteText, setInviteText] = useState('')

  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">UX-заготовка</span>
          <h2>Создание группы и добавление участников</h2>
        </div>
      </div>
      <div className="group-form">
        <label>
          Общее название
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
        </label>
        <label>
          Моё личное название
          <input
            placeholder="Например: воскресные планы"
            value={personalName}
            onChange={(event) => setPersonalName(event.target.value)}
          />
        </label>
        <label>
          Участники
          <input
            placeholder="Имя или email"
            value={inviteText}
            onChange={(event) => setInviteText(event.target.value)}
          />
        </label>
        <div className="member-picks">
          {['Маша', 'Дима', 'Ира'].map((name) => (
            <button className="member-chip" key={name} type="button">
              <Plus size={14} />
              {name}
            </button>
          ))}
        </div>
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
  ideas,
  inboxMode = false,
  emptyText,
}: {
  actions?: IdeaActions
  ideas: Idea[]
  inboxMode?: boolean
  emptyText?: string
}) {
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', note: '' })

  function startEditing(idea: Idea) {
    setEditingIdeaId(idea.id)
    setEditDraft({ title: idea.title, note: idea.note })
  }

  function saveEdit(idea: Idea) {
    actions?.onEdit(idea, editDraft)
    setEditingIdeaId(null)
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
