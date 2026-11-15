import { Button } from '@/components/Button'
import { Kbd } from '@/components/Kbd'
import { FeatureOverride } from '@/lib/features'
import { Specimen, SpecimenGrid } from '../kit'

export function Keycaps() {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Kbd>1</Kbd>
        <Kbd>2</Kbd>
        <Kbd>R</Kbd>
        <Kbd>E</Kbd>
        <Kbd>Enter</Kbd>
        <Kbd>Ctrl+Enter</Kbd>
      </div>
      <SpecimenGrid>
        <Specimen label="On a button">
          <Button>
            Reveal answer <Kbd>R</Kbd>
          </Button>
        </Specimen>
        <Specimen label="Hints turned off in Settings">
          <FeatureOverride flags={{ shortcutHints: false }}>
            <Button>
              Reveal answer <Kbd>R</Kbd>
            </Button>
          </FeatureOverride>
        </Specimen>
      </SpecimenGrid>
    </>
  )
}
