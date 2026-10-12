import { useId } from 'react'

export default function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  const name = useId()
  const labelId = `${name}-label`
  return (
    <div>
      <div className="mb-2 text-sm font-extrabold text-ink-soft" id={labelId}>
        {label}
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {options.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer items-center justify-center min-h-12 rounded-2xl bg-cream px-1 py-3 font-display text-base font-semibold ring-3 ring-transparent active:scale-95 has-checked:bg-sel has-checked:ring-berry has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
          >
            {/* Native radios: arrow keys and a single tab stop come from the browser */}
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  )
}
