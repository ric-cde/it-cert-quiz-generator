import { ErrorText, PageError, PageLoading } from '@/components/Notices'
import { Specimen, SpecimenGrid } from '../kit'

export function Messages() {
  return (
    <SpecimenGrid>
      <Specimen label="Screen loading">
        <PageLoading />
      </Specimen>
      <Specimen label="Screen couldn't load">
        <PageError>Couldn't load this quiz: Server responded with 500</PageError>
      </Specimen>
      <Specimen label="Error">
        <ErrorText>Couldn't save that, so please try again: Server responded with 500</ErrorText>
      </Specimen>
    </SpecimenGrid>
  )
}
