import { Compass, Moon, Plus, Search, Sun } from 'lucide-react'
import { getTourIdForView, views, type View } from '../appNavigation'
import type { Member, Space } from '../mock/vmestraData'

type AppLayoutProps = {
  activeView: View
  children: React.ReactNode
  currentUser: Member
  selectedSpace: Space
  setActiveView: (value: View) => void
  setTheme: (value: 'light' | 'dark') => void
  theme: 'light' | 'dark'
}

export function AppLayout({
  activeView,
  children,
  currentUser,
  selectedSpace,
  setActiveView,
  setTheme,
  theme,
}: AppLayoutProps) {
  return (
    <>
      <Sidebar activeView={activeView} selectedSpace={selectedSpace} setActiveView={setActiveView} />
      <section className="workspace">
        <Header
          activeView={activeView}
          currentUser={currentUser}
          selectedSpace={selectedSpace}
          setActiveView={setActiveView}
          setTheme={setTheme}
          theme={theme}
        />
        {activeView !== 'spaces' && (
          <CurrentSpaceStrip selectedSpace={selectedSpace} setActiveView={setActiveView} />
        )}
        {children}
      </section>
    </>
  )
}

function Sidebar({
  activeView,
  selectedSpace,
  setActiveView,
}: {
  activeView: View
  selectedSpace: Space
  setActiveView: (value: View) => void
}) {
  return (
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
              data-tour-id={getTourIdForView(view.id)}
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
  )
}

function Header({
  activeView,
  currentUser,
  selectedSpace,
  setActiveView,
  setTheme,
  theme,
}: {
  activeView: View
  currentUser: Member
  selectedSpace: Space
  setActiveView: (value: View) => void
  setTheme: (value: 'light' | 'dark') => void
  theme: 'light' | 'dark'
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

function CurrentSpaceStrip({
  selectedSpace,
  setActiveView,
}: {
  selectedSpace: Space
  setActiveView: (value: View) => void
}) {
  return (
    <section className="current-space-strip">
      <div>
        <span className="eyebrow">Вы внутри пространства</span>
        <strong>{selectedSpace.title}</strong>
        <p>{selectedSpace.description}</p>
      </div>
      <button className="secondary-button" type="button" onClick={() => setActiveView('spaces')}>
        <Compass size={17} />
        Все пространства
      </button>
    </section>
  )
}
