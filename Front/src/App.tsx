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
import { useMemo, useState } from 'react'
import './App.css'
import {
  currentUser,
  folders,
  history,
  ideas,
  recommendations,
  spaces,
  type Idea,
  type Space,
  type VisualDirection,
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

const directions: { id: VisualDirection; title: string; note: string }[] = [
  { id: 'minimal', title: 'Спокойный', note: 'больше воздуха, меньше шума' },
  { id: 'warm', title: 'Тёплый', note: 'личное настроение и мягкие акценты' },
  { id: 'dashboard', title: 'Обзорный', note: 'плотнее, но без канбана' },
]

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

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [direction, setDirection] = useState<VisualDirection>('minimal')
  const [activeView, setActiveView] = useState<View>('spaces')
  const [selectedSpaceId, setSelectedSpaceId] = useState('friends')
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [quickIdea, setQuickIdea] = useState('')

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? spaces[0]
  const spaceIdeas = ideas.filter((idea) => idea.spaceId === selectedSpace.id)
  const inboxIdeas = spaceIdeas.filter((idea) => idea.status === 'inbox')
  const plannedIdeas = spaceIdeas.filter((idea) => idea.status === 'planned')
  const spaceHistory = history.filter((entry) => entry.spaceId === selectedSpace.id)

  const suggestedTags = useMemo(() => {
    const text = quickIdea.toLowerCase()
    if (text.includes('кино') || text.includes('фильм')) return ['вечер', 'кино', 'дома']
    if (text.includes('кафе') || text.includes('завтрак')) return ['еда', 'утро', 'вне дома']
    if (text.includes('гулять') || text.includes('прогул')) return ['вне дома', 'бесплатно']
    return ['входящие', 'потом уточнить']
  }, [quickIdea])

  return (
    <main className="app-shell" data-theme={theme} data-direction={direction}>
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

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

        <nav className="nav-list">
          {views.map((view) => {
            const Icon = view.icon
            return (
              <button
                className={activeView === view.id ? 'active' : ''}
                key={view.id}
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
          <strong>{selectedSpace.title}</strong>
          <p>Поиск похожих идей и рекомендации ограничены только им.</p>
        </div>
      </aside>

      <section className="workspace">
        <Header
          activeView={activeView}
          direction={direction}
          setDirection={setDirection}
          theme={theme}
          setTheme={setTheme}
          selectedSpace={selectedSpace}
          setActiveView={setActiveView}
        />

        {activeView === 'spaces' && (
          <SpacesScreen
            selectedSpaceId={selectedSpaceId}
            onSelect={(spaceId) => {
              setSelectedSpaceId(spaceId)
              setActiveView('space')
            }}
            onCreateGroup={() => setActiveView('group')}
          />
        )}

        {activeView === 'space' && (
          <SpaceScreen
            selectedSpace={selectedSpace}
            quickIdea={quickIdea}
            setQuickIdea={setQuickIdea}
            suggestedTags={suggestedTags}
            inboxIdeas={inboxIdeas}
            plannedIdeas={plannedIdeas}
            spaceIdeas={spaceIdeas}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'inbox' && <InboxScreen ideas={inboxIdeas} />}
        {activeView === 'library' && <LibraryScreen ideas={spaceIdeas} />}
        {activeView === 'recommendations' && <RecommendationsScreen selectedSpace={selectedSpace} />}
        {activeView === 'planning' && <PlanningScreen selectedSpace={selectedSpace} plannedIdeas={plannedIdeas} />}
        {activeView === 'calendar' && <CalendarScreen plannedIdeas={plannedIdeas} />}
        {activeView === 'history' && <HistoryScreen entries={spaceHistory} />}
        {activeView === 'profile' && <ProfileScreen onCreateGroup={() => setActiveView('group')} />}
        {activeView === 'group' && <GroupScreen />}
      </section>
    </main>
  )
}

function Header({
  activeView,
  direction,
  setDirection,
  theme,
  setTheme,
  selectedSpace,
  setActiveView,
}: {
  activeView: View
  direction: VisualDirection
  setDirection: (value: VisualDirection) => void
  theme: 'light' | 'dark'
  setTheme: (value: 'light' | 'dark') => void
  selectedSpace: Space
  setActiveView: (value: View) => void
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

        <div className="segmented" aria-label="Визуальное направление">
          {directions.map((item) => (
            <button
              className={direction === item.id ? 'active' : ''}
              key={item.id}
              title={item.note}
              type="button"
              onClick={() => setDirection(item.id)}
            >
              {item.title}
            </button>
          ))}
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

function Onboarding({ onClose }: { onClose: () => void }) {
  const steps = [
    ['Сохранить идею', 'Поле быстрого добавления сначала сохраняет текст, а уточнение можно сделать позже.'],
    ['Выбрать пространство', 'Идеи личного и групповых пространств не смешиваются.'],
    ['Подобрать вечер', 'Подборки используют простые фильтры и моковые причины, без обещания AI в MVP.'],
    ['Запланировать', 'Можно выбрать дату, время и участников внутри текущей группы.'],
    ['Запомнить историю', 'После активности остаётся общая запись и опциональный личный комментарий.'],
  ]

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <span className="eyebrow">Мини-онбординг</span>
          <button type="button" onClick={onClose}>
            Пропустить
          </button>
        </div>
        <h2>Vmestra помогает не терять идеи и мягко выбирать, чем заняться</h2>
        <div className="onboarding-steps">
          {steps.map(([title, note], index) => (
            <div className="onboarding-step" key={title}>
              <span>{index + 1}</span>
              <strong>{title}</strong>
              <p>{note}</p>
            </div>
          ))}
        </div>
        <button className="primary-button" type="button" onClick={onClose}>
          Перейти к прототипу
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}

function SpacesScreen({
  selectedSpaceId,
  onSelect,
  onCreateGroup,
}: {
  selectedSpaceId: string
  onSelect: (spaceId: string) => void
  onCreateGroup: () => void
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
          {spaces.map((space) => (
            <button
              className={`space-row ${selectedSpaceId === space.id ? 'selected' : ''}`}
              key={space.id}
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
  suggestedTags,
  inboxIdeas,
  plannedIdeas,
  spaceIdeas,
  setActiveView,
}: {
  selectedSpace: Space
  quickIdea: string
  setQuickIdea: (value: string) => void
  suggestedTags: string[]
  inboxIdeas: Idea[]
  plannedIdeas: Idea[]
  spaceIdeas: Idea[]
  setActiveView: (value: View) => void
}) {
  return (
    <div className="space-screen">
      <section className="section-band quick-band">
        <div>
          <span className="eyebrow">{selectedSpace.kind === 'personal' ? 'Личное' : 'Группа'}</span>
          <h2>{selectedSpace.title}</h2>
          <p>{selectedSpace.description}</p>
        </div>
        <QuickAdd value={quickIdea} onChange={setQuickIdea} suggestedTags={suggestedTags} />
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
          <RecommendationCards compact />
        </aside>
      </div>
    </div>
  )
}

function QuickAdd({
  value,
  onChange,
  suggestedTags,
}: {
  value: string
  onChange: (value: string) => void
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
        <button className="primary-button" type="button">
          Сохранить
          <Check size={17} />
        </button>
      </div>
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
      <IdeaList ideas={ideas} inboxMode />
    </section>
  )
}

function LibraryScreen({ ideas }: { ideas: Idea[] }) {
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
      </aside>
    </div>
  )
}

function RecommendationsScreen({ selectedSpace }: { selectedSpace: Space }) {
  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Подборки в «{selectedSpace.title}»</span>
          <h2>Помочь выбрать, а не заставить выполнить</h2>
        </div>
        <span className="soft-badge">простые фильтры MVP</span>
      </div>
      <RecommendationCards />
    </section>
  )
}

function PlanningScreen({ selectedSpace, plannedIdeas }: { selectedSpace: Space; plannedIdeas: Idea[] }) {
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
              {ideas
                .filter((idea) => idea.spaceId === selectedSpace.id)
                .map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {idea.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Когда
            <input defaultValue="2026-06-12T20:00" type="datetime-local" />
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
        <IdeaList ideas={plannedIdeas} />
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
    </section>
  )
}

function HistoryScreen({ entries }: { entries: typeof history }) {
  return (
    <section className="section-band full-band">
      <div className="section-title">
        <div>
          <span className="eyebrow">Память пространства</span>
          <h2>История того, что уже сделали</h2>
        </div>
      </div>
      <div className="timeline">
        {entries.map((entry) => (
          <article className="timeline-entry" key={entry.id}>
            <time>{entry.date}</time>
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.note}</p>
              {entry.privateNote && <span>Личный комментарий: {entry.privateNote}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProfileScreen({ onCreateGroup }: { onCreateGroup: () => void }) {
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

function RecommendationCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'recommendation-list compact' : 'recommendation-list'}>
      {recommendations.map((recommendation) => (
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
      ))}
    </div>
  )
}

function IdeaList({ ideas, inboxMode = false }: { ideas: Idea[]; inboxMode?: boolean }) {
  return (
    <div className="idea-list">
      {ideas.map((idea) => (
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
            <span className="status-pill">{idea.status === 'planned' ? 'В планах' : inboxMode ? 'Уточнить' : idea.category}</span>
            {idea.similarIdeaIds && <span className="similar-note">есть похожая внутри пространства</span>}
          </div>
        </article>
      ))}
    </div>
  )
}

export default App
