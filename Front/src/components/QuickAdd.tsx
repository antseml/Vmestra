import { Check } from 'lucide-react'

export function QuickAdd({
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
        {suggestedTags.length > 0 ? (
          <div className="tag-row">
            {suggestedTags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span className="form-note">Сначала сохраните идею, затем добавьте папку и теги через «Изменить».</span>
        )}
        <button className="primary-button" type="button" disabled={isSaving || !value.trim()} onClick={onSave}>
          {isSaving ? 'Сохраняем' : 'Сохранить'}
          <Check size={17} />
        </button>
      </div>
      {notice && <p className="form-note">{notice}</p>}
    </div>
  )
}
