import { ArrowLeft } from 'lucide-react'
import { type ReactNode, useId } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { ErrorText, PageError, PageLoading } from '@/components/Notices'
import { SectionLabel } from '@/components/SectionLabel'
import { Segmented } from '@/components/Segmented'
import { Switch } from '@/components/Switch'
import { useSettings, useUpdateSettings } from '@/lib/settings'
import type { OptionOrder } from '@shared/domain'
import { FEATURES, featureGroups } from '@shared/features'

const OPTION_ORDER_CHOICES: { value: OptionOrder; label: string }[] = [
  { value: 'labelled', label: 'Lettered in order' },
  { value: 'source', label: 'Always in order' },
  { value: 'shuffle', label: 'Always shuffle' },
]

/** One group of switches, in its own card. */
function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <Card as="section" padding="lg" aria-labelledby={id}>
      <SectionLabel id={id}>{title}</SectionLabel>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

/**
 * Settings, saved as soon as they change. The feature switches come from `shared/features.ts`,
 * so a new flag appears here without changes to this screen.
 */
export function SettingsPage() {
  const settings = useSettings()
  const save = useUpdateSettings()

  if (settings.isPending) return <PageLoading className="mx-auto max-w-2xl" />
  if (settings.isError) {
    return <PageError className="mx-auto max-w-2xl">Couldn't load your settings: {settings.error.message}</PageError>
  }
  const { features, syntaxHighlighting, optionOrder } = settings.data

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Home
        </Link>
        <h1 className="mt-2 text-2xl">Settings</h1>
        <p className="text-sm text-ink-soft">Changes are saved as soon as you make them.</p>
      </div>

      <SettingsGroup title="Reading">
        <Switch
          label="Syntax highlighting"
          hint="Colours the code in questions. The code icon on any code block changes this too."
          checked={syntaxHighlighting}
          onChange={(on) => save.mutate({ syntaxHighlighting: on })}
        />
      </SettingsGroup>

      <SettingsGroup title="Quizzes">
        <div>
          <p className="text-sm font-semibold">Option order</p>
          <p className="mb-2 text-xs text-ink-soft">
            Lettered options keep the letters from their source, such as a study guide's A to G, which its explanations
            refer to. Options that depend on their order, such as "All of the above", always stay in order. Applies to
            quizzes you start from now on.
          </p>
          <Segmented
            label="Option order"
            value={optionOrder}
            options={OPTION_ORDER_CHOICES}
            onChange={(value) => save.mutate({ optionOrder: value })}
          />
        </div>
      </SettingsGroup>

      {featureGroups().map(({ group, keys }) => (
        <SettingsGroup key={group} title={group}>
          {keys.map((key) => (
            <Switch
              key={key}
              label={FEATURES[key].label}
              hint={FEATURES[key].description}
              checked={features[key]}
              onChange={(on) => save.mutate({ features: { [key]: on } })}
            />
          ))}
        </SettingsGroup>
      ))}

      {save.isError && <ErrorText>Couldn't save that, so it was put back: {save.error.message}</ErrorText>}
    </div>
  )
}
