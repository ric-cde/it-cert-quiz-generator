import { Copy, Flag, Pencil, Sparkles } from 'lucide-react'
import { Button, type ButtonVariant } from '@/components/Button'
import { Kbd } from '@/components/Kbd'
import { Specimen } from '../kit'

const BUTTON_VARIANTS: { variant: ButtonVariant; label: string }[] = [
  { variant: 'primary', label: 'Primary' },
  { variant: 'secondary', label: 'Secondary' },
  { variant: 'ghost', label: 'Ghost' },
  { variant: 'danger', label: 'Danger' },
]
export function Buttons() {
  return (
    <>
      <div className="overflow-x-auto">
        <div className="grid w-max grid-cols-[6rem_repeat(5,auto)] items-center gap-x-4 gap-y-3 text-xs font-semibold text-ink-soft">
          <span />
          <span>Default</span>
          <span>Hover</span>
          <span>Focus</span>
          <span>Disabled</span>
          <span>Loading</span>
          {BUTTON_VARIANTS.flatMap(({ variant, label }) => [
            <span key={`${variant}-label`}>{label}</span>,
            <Button key={`${variant}-default`} variant={variant}>
              Submit
            </Button>,
            <Button key={`${variant}-hover`} variant={variant} data-force="hover">
              Submit
            </Button>,
            <Button key={`${variant}-focus`} variant={variant} data-force="focus">
              Submit
            </Button>,
            <Button key={`${variant}-disabled`} variant={variant} disabled>
              Submit
            </Button>,
            <Button key={`${variant}-loading`} variant={variant} loading>
              Judging
            </Button>,
          ])}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <Specimen label="Small">
          <div className="flex gap-2">
            <Button size="sm" variant="primary">
              Next
            </Button>
            <Button size="sm">Retry missed</Button>
            <Button size="sm" variant="ghost">
              <Flag className="size-4" aria-hidden="true" /> Flag
            </Button>
          </div>
        </Specimen>
        <Specimen label="With a keyboard shortcut">
          <div className="flex gap-2">
            <Button variant="primary">
              Submit <Kbd tone="on-accent">Enter</Kbd>
            </Button>
            <Button>
              Reveal answer <Kbd>R</Kbd>
            </Button>
          </div>
        </Specimen>
        <Specimen label="Icon only">
          <div className="flex gap-2">
            <Button iconOnly aria-label="Edit question">
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button iconOnly size="sm" variant="ghost" aria-label="Copy">
              <Copy className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </Specimen>
        <Specimen label="Claude action (always a deliberate press)">
          <Button>
            <Sparkles className="size-4" aria-hidden="true" /> Generate explanation
          </Button>
        </Specimen>
      </div>
    </>
  )
}
