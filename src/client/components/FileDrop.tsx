import clsx from 'clsx'
import { Upload } from 'lucide-react'
import { type DragEvent, useId, useState } from 'react'

/** Choose a file, or drop one here. Keyboard users get the file input underneath. */
export function FileDrop({
  label,
  hint,
  accept,
  error,
  disabled = false,
  onFile,
}: {
  label: string
  hint?: string
  accept?: string
  error?: string
  disabled?: boolean
  onFile: (file: File) => void
}) {
  const id = useId()
  const errorId = `${id}-error`
  const [dragging, setDragging] = useState(false)

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !disabled) onFile(file)
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        data-dragging={dragging || undefined}
        className={clsx(
          'flex flex-col items-center gap-1 rounded-lg border-[1.5px] border-dashed px-4 py-8 text-center transition-colors duration-100',
          'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
          disabled ? 'cursor-not-allowed border-line bg-sunken' : 'cursor-pointer hocus:border-accent hocus:bg-accent-soft/40',
          !disabled && (dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface'),
        )}
      >
        <Upload className="size-5 text-ink-soft" aria-hidden="true" />
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-sm text-ink-soft">{hint}</span>}
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Cleared so that choosing the same file again, after fixing it, still counts.
            event.target.value = ''
            if (file) onFile(file)
          }}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-wrong-ink">
          {error}
        </p>
      )}
    </div>
  )
}
