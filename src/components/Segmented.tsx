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
      <div className="setting-label" id={labelId}>
        {label}
      </div>
      <div
        className="segmented-control"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {options.map((o) => (
          <label
            key={o.id}
            className="segment-option"
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
