import { Users } from 'lucide-react'
import type { Space } from '../mock/vmestraData'

export function SpacesScreen({
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
