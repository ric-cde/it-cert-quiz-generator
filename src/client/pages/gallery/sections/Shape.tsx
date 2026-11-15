import { Specimen } from '../kit'

export function Shape() {
  return (
    <div className="flex flex-wrap gap-8">
      <Specimen label="Spacing (multiples of 4px)">
        <div className="flex items-end gap-2">
          {[1, 2, 3, 4, 6, 8, 12].map((step) => (
            <div key={step} className="text-center">
              <div className="bg-accent" style={{ width: `${step * 4}px`, height: `${step * 4}px` }} />
              <p className="mt-1 text-xs text-ink-soft">{step * 4}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen label="Radii">
        <div className="flex gap-3">
          {['sm', 'md', 'lg', 'full'].map((radius) => (
            <div key={radius} className="text-center">
              <div
                className="size-12 border-[1.5px] border-accent bg-accent-soft"
                style={{ borderRadius: `var(--radius-${radius})` }}
              />
              <p className="mt-1 font-mono text-xs text-ink-soft">{radius}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen label="Shadows">
        <div className="flex gap-4">
          {['card', 'raised', 'bar'].map((shadow) => (
            <div key={shadow} className="text-center">
              <div className="size-12 rounded-md bg-surface" style={{ boxShadow: `var(--shadow-${shadow})` }} />
              <p className="mt-1 font-mono text-xs text-ink-soft">{shadow}</p>
            </div>
          ))}
        </div>
      </Specimen>
    </div>
  )
}
