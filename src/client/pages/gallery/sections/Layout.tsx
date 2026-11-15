import { useState } from 'react'
import { Card } from '@/components/Card'
import { Disclosure } from '@/components/Disclosure'
import { SectionLabel } from '@/components/SectionLabel'
import { Specimen, SpecimenGrid } from '../kit'

const SAMPLE = <p className="text-sm">Sample content inside the card.</p>

export function Layout() {
  const [quietOpen, setQuietOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(true)
  return (
    <>
      <SpecimenGrid>
        <Specimen label="Card, padding sm">
          <Card padding="sm">{SAMPLE}</Card>
        </Specimen>
        <Specimen label="Card, padding md (default)">
          <Card>{SAMPLE}</Card>
        </Specimen>
        <Specimen label="Card, padding lg (a screen's main card)">
          <Card padding="lg">{SAMPLE}</Card>
        </Specimen>
        <Specimen label="Card, raised">
          <Card elevation="raised">{SAMPLE}</Card>
        </Specimen>
        <Specimen label="Card, flat">
          <Card elevation="flat">{SAMPLE}</Card>
        </Specimen>
        <Specimen label="Card, sunken (set apart, such as a revealed question)">
          <Card tone="sunken">{SAMPLE}</Card>
        </Specimen>
      </SpecimenGrid>
      <SpecimenGrid>
        <Specimen label="Section label">
          <SectionLabel as="h3">Java</SectionLabel>
        </Specimen>
        <Specimen label="Disclosure, quiet">
          <Disclosure summary="Abandoned exams (2)" open={quietOpen} onToggle={() => setQuietOpen((open) => !open)}>
            {SAMPLE}
          </Disclosure>
        </Specimen>
        <Specimen label="Disclosure, card">
          <Disclosure
            summary="Review answers"
            tone="card"
            open={cardOpen}
            onToggle={() => setCardOpen((open) => !open)}
          >
            {SAMPLE}
          </Disclosure>
        </Specimen>
      </SpecimenGrid>
    </>
  )
}
