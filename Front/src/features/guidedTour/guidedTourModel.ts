import type { View } from '../../appNavigation'

const TOUR_STORAGE_KEY_PREFIX = 'vmestra-guided-tour-completed'

function getTourStorageKey(userId: string) {
  return `${TOUR_STORAGE_KEY_PREFIX}:${userId}`
}

export function shouldShowGuidedTour(userId?: string) {
  if (!userId) return false
  try {
    return localStorage.getItem(getTourStorageKey(userId)) !== 'true'
  } catch {
    return true
  }
}

export function markGuidedTourCompleted(userId?: string) {
  if (!userId) return
  try {
    localStorage.setItem(getTourStorageKey(userId), 'true')
  } catch {
    // The tour can still close in restricted storage contexts.
  }
}

export const tourSteps: Array<{
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
