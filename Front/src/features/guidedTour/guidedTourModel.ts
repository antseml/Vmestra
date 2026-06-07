import type { View } from '../../appNavigation'

const TOUR_STORAGE_KEY = 'vmestra-guided-tour-completed'

export function shouldShowGuidedTour() {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) !== 'true'
  } catch {
    return true
  }
}

export function markGuidedTourCompleted() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
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
