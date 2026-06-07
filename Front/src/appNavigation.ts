import {
  CalendarDays,
  Clock3,
  Compass,
  History,
  Inbox,
  LayoutDashboard,
  Settings,
  Sparkles,
  Tags,
  type LucideIcon,
} from 'lucide-react'

export type View =
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

export type NavigationView = Exclude<View, 'group'>

export const views: { id: NavigationView; title: string; icon: LucideIcon }[] = [
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

export function getTourIdForView(view: View) {
  if (view === 'inbox') return 'inbox-nav'
  if (view === 'recommendations') return 'collections-nav'
  if (view === 'planning') return 'planning-nav'
  if (view === 'history') return 'history-nav'
  return undefined
}
