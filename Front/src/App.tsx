import {
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  FolderOpen,
  History,
  Inbox,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Tags,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import './App.css'
import { DEFAULT_DEMO_USER_ID } from './api/apiContract'
import { dataClient, dataSourceLabel } from './api/dataClient'
import {
  type Folder,
  type HistoryEntry,
  type Idea,
  type Member,
  type Recommendation,
  type Space,
} from './mock/vmestraData'

type View =
  | 'spaces'
  | 'space'
  | 'inbox'
  | 'library'
  | 'recommendations'
  | 'planning'
  | 'calendar'
  | 'history'
  | 'profile'
  | 'group'

const views: { id: View; title: string; icon: React.ElementType }[] = [
  { id: 'spaces', title: 'Пространства', icon: Compass },
  { id: 'space', title: 'Обзор', icon: LayoutDashboard },
  { id: 'inbox', title: 'Входящие', icon: Inbox },
  { id: 'library', title: 'Папки и теги', icon: Tags },
  { id: 'recommendations', title: 'Подборки', icon: Sparkles },
  { id: 'planning', title: 'Планирование', icon: Clock3 },
  { id: 'calendar', title: 'Календарь', icon: CalendarDays },
  { id: 'history', title: 'История', icon: History },
  { id: 'profile', title: 'Профиль', icon: Settings },
]

const TOUR_STORAGE_KEY = 'vmestra-guided-tour-completed'

function shouldShowGuidedTour() {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) !== 'true'
  } catch {
    return true
  }
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [activeView, setActiveView] = useState<View>('spaces')
  const [selectedSpaceId, setSelectedSpaceId] = useState('friends')
  const [showOnboarding, setShowOnboarding] = useState(shouldShowGuidedTour)
  const [tourStep, setTourStep] = useState(0)
  const [quickIdea, setQuickIdea] = useState('')
  const [currentUser, setCurrentUser] = useState<Member | null>(null)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [spaceIdeas, setSpaceIdeas] = useState<Idea[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [spaceHistory, setSpaceHistory] = useState<HistoryEntry[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingIdea, setIsSavingIdea] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [quickAddNotice, setQuickAddNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? spaces[0]
  const inboxIdeas = spaceIdeas.filter((idea) => idea.status === 'inbox')
  const plannedIdeas = spaceIdeas.filter((idea) => idea.status === 'planned')
  const selectedSpaceWithLiveStats = selectedSpace
    ? {
        ...selectedSpace,
        stats: {
          inbox: inboxIdeas.length,
          ideas: spaceIdeas.length,
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
        const nextSpaces = await dataClient.getSpaces(user.id || DEFAULT_DEMO_USER_ID)

        if (!isMounted) return

        setCurrentUser(user)
        setSpaces(nextSpaces)
        setSelectedSpaceId((currentSpaceId) =>
          nextSpaces.some((space) => space.id === currentSpaceId) ? currentSpaceId : (nextSpaces[0]?.id ?? ''),
        )
      } catch {
        if (isMounted) setLoadError('Не удалось загрузить пространства. Проверьте источник данных и попробуйте снова.')
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
    if (!selectedSpace?.id) return

    let isMounted = true

    async function loadSpaceData() {
      setLoadError(null)

      try {
        const [nextIdeas, nextFolders, nextCategories, nextPlan, nextHistory, nextRecommendations] = await Promise.all([
          dataClient.getIdeas(selectedSpace.id),
          dataClient.getFolders(selectedSpace.id),
          dataClient.getCategories(selectedSpace.id),
          dataClient.getPlan(selectedSpace.id),
          dataClient.getHistory(selectedSpace.id),
          dataClient.getRecommendations(selectedSpace.id),
        ])

        if (!isMounted) return

        const plannedIds = new Set(nextPlan.map((idea) => idea.id))
        setSpaceIdeas(nextIdeas.map((idea) => (plannedIds.has(idea.id) ? { ...idea, status: 'planned' } : idea)))
        setFolders(nextFolders)
        setCategories(nextCategories)
        setSpaceHistory(nextHistory)
        setRecommendations(nextRecommendations)
      } catch {
        if (isMounted) setLoadError('Не удалось загрузить данные пространства. Попробуйте обновить экран.')
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

  function completeGuidedTour() {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    } catch {
      // The tour can still close in restricted storage contexts.
    }
    setShowOnboarding(false)
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
      <aside className="sidebar" aria-label="Навигация Vmestra">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>Vmestra</strong>
            <span>идеи и планы внутри своих пространств</span>
          </div>
        </div>

        <button className="quick-create" type="button" onClick={() => setActiveView('space')}>
          <Plus size={18} />
          Быстро добавить
        </button>

        <nav className="nav-list" data-tour-id="spaces-nav">
          {views.map((view) => {
            const Icon = view.icon
            return (
              <button
                className={activeView === view.id ? 'active' : ''}
                key={view.id}
                data-tour-id={
                  view.id === 'inbox'
                    ? 'inbox-nav'
                    : view.id === 'recommendations'
                      ? 'collections-nav'
                      : view.id === 'planning'
                        ? 'planning-nav'
                        : view.id === 'history'
                          ? 'history-nav'
                          : undefined
                }
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                <Icon size={17} />
                {view.title}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-panel">
          <span className="eyebrow">Текущее пространство</span>
          <strong>{selectedSpaceWithLiveStats.title}</strong>
          <p>Поиск похожих идей и рекомендации ограничены только им.</p>
        </div>
      </aside>

      <section className="workspace">
        <Header
          activeView={activeView}
          theme={theme}
          setTheme={setTheme}
          selectedSpace={selectedSpaceWithLiveStats}
          setActiveView={setActiveView}
          currentUser={currentUser}
        />

        {activeView !== 'spaces' && (
          <section className="current-space-strip">
            <div>
              <span className="eyebrow">Вы внутри пространства</span>
              <strong>{selectedSpaceWithLiveStats.title}</strong>
              <p>{selectedSpaceWithLiveStats.description}</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => setActiveView('spaces')}>
              <Compass size={17} />
              Все пространства
            </button>
          </section>
        )}

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
            recommendations={recommendations}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'inbox' && <InboxScreen ideas={inboxIdeas} />}
        {activeView === 'library' && <LibraryScreen ideas={spaceIdeas} folders={folders} categories={categories} />}
        {activeView === 'recommendations' && (
          <RecommendationsScreen selectedSpace={selectedSpaceWithLiveStats} recommendations={recommendations} />
        )}
        {activeView === 'planning' && (
          <PlanningScreen selectedSpace={selectedSpaceWithLiveStats} plannedIdeas={plannedIdeas} spaceIdeas={spaceIdeas} />
        )}
        {activeView === 'calendar' && <CalendarScreen plannedIdeas={plannedIdeas} />}
        {activeView === 'history' && <HistoryScreen entries={spaceHistory} />}
        {activeView === 'profile' && <ProfileScreen currentUser={currentUser} onCreateGroup={() => setActiveView('group')} />}
        {activeView === 'group' && <GroupScreen />}
      </section>

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

function Header({
  activeView,
  theme,
  setTheme,
  selectedSpace,
  setActiveView,
  currentUser,
}: {
  activeView: View
  theme: 'light' | 'dark'
  setTheme: (value: 'light' | 'dark') => void
  selectedSpace: Space
  setActiveView: (value: View) => void
  currentUser: Member
}) {
  const title = views.find((view) => view.id === activeView)?.title ?? 'Пространство'

  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Front прототип MVP</span>
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        <div className="search-pill">
          <Search size={16} />
          <span>Поиск в «{selectedSpace.title}»</span>
        </div>

        <button
          className="icon-button"
          title="Переключить тему"
          type="button"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button className="ghost-button" type="button" onClick={() => setActiveView('profile')}>
          {currentUser.avatar}
        </button>
      </div>
    </header>
  )
}

const tourSteps: Array<{
  id: string
  text: string
  view: View
  placement: 'right' | 'bottom'
}> = [
  {
    id: 'spaces-nav',
    text: 'Сначала выбери, где живут идеи: личное, друзья, семья или отдельная группа.',
    view: 'spaces',
    placement: 'right',
  },
  {
    id: 'space-card',
    text: 'Идеи из разных пространств не смешиваются.',
    view: 'spaces',
    placement: 'right',
  },
  {
    id: 'quick-add',
    text: 'Запиши идею коротко. Разобрать по папкам можно потом.',
    view: 'space',
    placement: 'bottom',
  },
  {
    id: 'inbox-nav',
    text: 'Сюда попадает всё, что ещё не разобрано.',
    view: 'inbox',
    placement: 'right',
  },
  {
    id: 'collections-nav',
    text: 'Здесь можно быстро выбрать, чем заняться.',
    view: 'recommendations',
    placement: 'right',
  },
  {
    id: 'planning-nav',
    text: 'Когда решили — добавь дату, время и участников.',
    view: 'planning',
    placement: 'right',
  },
  {
    id: 'history-nav',
    text: 'То, что сделали, остаётся памятью пространства.',
    view: 'history',
    placement: 'right',
  },
]

type TourPlacement = 'right' | 'bottom'

type TourLayout = {
  spotlight: CSSProperties
  card: CSSProperties
  placement: TourPlacement
}

const tourSpotlightPadding = 8
const tourCardWidth = 340
const tourCardEstimatedHeight = 220
const tourGap = 18
const tourViewportMargin = 14

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function getTourLayout(rect: DOMRect, preferredPlacement: TourPlacement): TourLayout {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const target = {
    width: Math.min(rect.width + tourSpotlightPadding * 2, viewportWidth - tourViewportMargin * 2),
    height: Math.min(rect.height + tourSpotlightPadding * 2, viewportHeight - tourViewportMargin * 2),
    left: 0,
    top: 0,
  }
  target.left = clamp(rect.left - tourSpotlightPadding, tourViewportMargin, viewportWidth - target.width - tourViewportMargin)
  target.top = clamp(rect.top - tourSpotlightPadding, tourViewportMargin, viewportHeight - target.height - tourViewportMargin)

  if (viewportWidth <= 680) {
    const mobileSpotlight = {
      width: Math.min(rect.width + tourSpotlightPadding * 2, viewportWidth),
      height: Math.min(rect.height + tourSpotlightPadding * 2, viewportHeight),
      left: 0,
      top: 0,
    }
    mobileSpotlight.left = clamp(rect.left - tourSpotlightPadding, 0, viewportWidth - mobileSpotlight.width)
    mobileSpotlight.top = clamp(rect.top - tourSpotlightPadding, 0, viewportHeight - mobileSpotlight.height)

    return {
      spotlight: mobileSpotlight,
      card: {
        left: tourViewportMargin,
        right: tourViewportMargin,
        bottom: 18,
        top: 'auto',
        width: 'auto',
      },
      placement: 'bottom',
    }
  }

  const canPlaceRight = target.left + target.width + tourGap + tourCardWidth <= viewportWidth - tourViewportMargin
  const placement = preferredPlacement === 'right' && canPlaceRight ? 'right' : 'bottom'

  if (placement === 'right') {
    return {
      spotlight: target,
      card: {
        left: target.left + target.width + tourGap,
        top: clamp(target.top, tourViewportMargin, viewportHeight - tourCardEstimatedHeight - tourViewportMargin),
      },
      placement,
    }
  }

  const cardTop =
    target.top + target.height + tourGap + tourCardEstimatedHeight <= viewportHeight - tourViewportMargin
      ? target.top + target.height + tourGap
      : target.top - tourCardEstimatedHeight - tourGap

  return {
    spotlight: target,
    card: {
      left: clamp(target.left, tourViewportMargin, viewportWidth - tourCardWidth - tourViewportMargin),
      top: clamp(cardTop, tourViewportMargin, viewportHeight - tourCardEstimatedHeight - tourViewportMargin),
    },
    placement,
  }
}

function GuidedTour({
  activeStep,
  onBack,
  onClose,
  onNext,
}: {
  activeStep: number
  onBack: () => void
  onClose: () => void
  onNext: () => void
}) {
  const step = tourSteps[activeStep]
  const isLastStep = activeStep === tourSteps.length - 1
  const [layout, setLayout] = useState<TourLayout | null>(null)

  useLayoutEffect(() => {
    let frame = 0

    function updateLayout() {
      const element = document.querySelector(`[data-tour-id="${step.id}"]`)
      if (!element) return

      const currentRect = element.getBoundingClientRect()
      const blockPosition =
        window.innerWidth <= 680 && currentRect.height > window.innerHeight * 0.38 ? 'start' : 'center'
      element.scrollIntoView({ block: blockPosition, inline: 'center', behavior: 'auto' })
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setLayout(getTourLayout(element.getBoundingClientRect(), step.placement))
      })
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)
    window.addEventListener('scroll', updateLayout, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateLayout)
      window.removeEventListener('scroll', updateLayout, true)
    }
  }, [step.id, step.placement])

  const placement = layout?.placement ?? step.placement

  return (
    <div className="tour-layer">
      <div className="tour-scrim" />
      <div className="tour-spotlight" style={layout?.spotlight} />
      <aside className={`tour-card tour-card-${placement}`} style={layout?.card}>
        <span className="eyebrow">
          Шаг {activeStep + 1} из {tourSteps.length}
        </span>
        <p>{step.text}</p>
        <div className="tour-arrow" />
        <div className="tour-actions">
          <button className="text-button" type="button" onClick={onClose}>
            Пропустить
          </button>
          <div>
            <button className="secondary-button" disabled={activeStep === 0} type="button" onClick={onBack}>
              Назад
            </button>
            <button className="primary-button" type="button" onClick={isLastStep ? onClose : onNext}>
              {isLastStep ? 'Готово' : 'Далее'}
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function SpacesScreen({
  selectedSpaceId,
  onSelect,
  onCreateGroup,
  spaces,
}: {
  selectedSpaceId: string
  onSelect: (spaceId: string) => void
  onCreateGroup: () => void
  spaces: Space[]
}) {
  return (
    <div className="screen-grid spaces-layout">
      <section className="section-band main-band">
        <div className="section-title">
          <div>
            <span className="eyebrow">Стартовый экран</span>
            <h2>Сначала пространство, потом идеи внутри него</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onCreateGroup}>
            <Users size={17} />
            Создать группу
          </button>
        </div>

        <div className="space-list">
          {spaces.map((space, index) => (
            <button
              className={`space-row ${selectedSpaceId === space.id ? 'selected' : ''}`}
              key={space.id}
              data-tour-id={index === 0 ? 'space-card' : undefined}
              type="button"
              onClick={() => onSelect(space.id)}
            >
              <div className="space-icon">{space.kind === 'personal' ? 'Я' : space.members.length}</div>
              <div>
                <strong>{space.title}</strong>
                <p>{space.description}</p>
              </div>
              <div className="space-stats">
                <span>{space.stats.ideas} идей</span>
                <span>{space.stats.planned} в планах</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="section-band side-band">
        <span className="eyebrow">UX-принцип</span>
        <h2>Нет общей ленты</h2>
        <p>
          На этом экране видны только контейнеры. Идеи появляются после входа в конкретное пространство,
          чтобы не нарушать изоляцию личного и группового контекста.
        </p>
      </aside>
    </div>
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
  recommendations: Recommendation[]
  setActiveView: (value: View) => void
}) {
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
        <Metric icon={Archive} label="В копилке" value={spaceIdeas.length} onClick={() => setActiveView('library')} />
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
          <IdeaList ideas={spaceIdeas.slice(0, 5)} />
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

function QuickAdd({
  value,
  onChange,
  onSave,
  isSaving,
  notice,
  suggestedTags,
}: {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  notice: string | null
  suggestedTags: string[]
}) {
  return (
    <div className="quick-add">
      <textarea
        aria-label="Быстро добавить идею"
        placeholder="Например: пересмотреть фильм у кого-нибудь дома"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="quick-add-footer">
        <div className="tag-row">
          {suggestedTags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <button className="primary-button" type="button" disabled={isSaving || !value.trim()} onClick={onSave}>
          {isSaving ? 'Сохраняем' : 'Сохранить'}
          <Check size={17} />
        </button>
      </div>
      {notice && <p className="form-note">{notice}</p>}
    </div>
  )
}

function InboxScreen({ ideas }: { ideas: Idea[] }) {
  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Сначала сохранить</span>
          <h2>Входящие для неразобранных идей</h2>
        </div>
        <span className="soft-badge">{ideas.length} ждут уточнения</span>
      </div>
      <IdeaList emptyText="Во входящих пока тихо. Новые быстрые идеи будут появляться здесь." ideas={ideas} inboxMode />
    </section>
  )
}

function LibraryScreen({ ideas, folders, categories }: { ideas: Idea[]; folders: Folder[]; categories: string[] }) {
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
        {folders.length === 0 && <EmptyState text="Папки появятся здесь, когда в пространстве будет первый справочник." />}
        <IdeaList ideas={ideas} />
      </section>

      <aside className="section-band side-band">
        <span className="eyebrow">Теги</span>
        <h2>Сервис может предложить, пользователь может поправить</h2>
        <div className="tag-cloud">
          {Array.from(new Set(ideas.flatMap((idea) => idea.tags))).map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        {ideas.every((idea) => idea.tags.length === 0) && <EmptyState text="Теги пока не заданы." compact />}
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

function PlanningScreen({
  selectedSpace,
  plannedIdeas,
  spaceIdeas,
}: {
  selectedSpace: Space
  plannedIdeas: Idea[]
  spaceIdeas: Idea[]
}) {
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
            <select defaultValue={plannedIdeas[0]?.id}>
              {spaceIdeas.length === 0 ? (
                <option>Сначала сохраните идею</option>
              ) : (
                spaceIdeas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Дата
            <input defaultValue="2026-06-12" type="date" />
          </label>
          <label>
            Время
            <input defaultValue="20:00" type="time" />
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
          <button className="primary-button" type="button">
            Добавить в планы
            <CalendarDays size={17} />
          </button>
        </div>
      </section>

      <aside className="section-band side-band">
        <span className="eyebrow">Уже в планах</span>
        <IdeaList emptyText="Пока ничего не запланировано. Идеи всё равно остаются доступными в копилке." ideas={plannedIdeas} />
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

function GroupScreen() {
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
          <input defaultValue="Новая группа" />
        </label>
        <label>
          Моё личное название
          <input placeholder="Например: воскресные планы" />
        </label>
        <label>
          Участники
          <input placeholder="Имя или email" />
        </label>
        <div className="member-picks">
          {['Маша', 'Дима', 'Ира'].map((name) => (
            <button className="member-chip" key={name} type="button">
              <Plus size={14} />
              {name}
            </button>
          ))}
        </div>
        <button className="primary-button" type="button">
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
  icon: React.ElementType
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

function IdeaList({ ideas, inboxMode = false, emptyText }: { ideas: Idea[]; inboxMode?: boolean; emptyText?: string }) {
  return (
    <div className="idea-list">
      {ideas.length === 0 ? (
        <EmptyState text={emptyText ?? 'Идей пока нет. Быстрое сохранение поможет начать с короткого текста.'} />
      ) : (
        ideas.map((idea) => (
          <article className="idea-card" key={idea.id}>
            <div>
              <span className="idea-folder">
                <FolderOpen size={14} />
                {idea.folder}
              </span>
              <h3>{idea.title}</h3>
              <p>{idea.note}</p>
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
                {idea.status === 'planned' ? 'Запланировано' : inboxMode ? 'Уточнить' : idea.category}
              </span>
              {idea.similarIdeaIds && <span className="similar-note">есть похожая внутри пространства</span>}
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
