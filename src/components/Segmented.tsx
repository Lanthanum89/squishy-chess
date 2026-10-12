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
      <div className="mb-2 text-sm font-semibold opacity-90" id={labelId}>
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
            className="flex cursor-pointer items-center justify-center rounded-2xl bg-panel/70 px-1 py-3 text-base font-bold active:scale-95 has-checked:bg-blush-deep has-checked:shadow-sm has-focus-visible:ring-4 has-focus-visible:ring-ink/50"
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
