import { ChevronRight } from 'lucide-react'
import { useLayoutEffect, useState, type CSSProperties } from 'react'
import { tourSteps } from './guidedTourModel'

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

export function GuidedTour({
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
