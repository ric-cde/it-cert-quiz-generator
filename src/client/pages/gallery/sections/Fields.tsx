import { TextArea, TextField } from '@/components/Field'
import { SpecimenGrid } from '../kit'

export function Fields() {
  return (
    <SpecimenGrid>
      <TextField label="Default" placeholder="Boyarsky Study Guide" />
      <TextField label="Filled" defaultValue="Boyarsky Study Guide" />
      <TextField label="Focus" defaultValue="Boyarsky Study Guide" data-force="focus" />
      <TextField label="Disabled" defaultValue="Boyarsky Study Guide" disabled />
      <TextField label="Error" defaultValue="" error="Give this source a name." />
      <TextArea label="Free-form answer" placeholder="Type your answer" />
      <TextArea label="Code answer" mono defaultValue={'List<String> names = new ArrayList<>();'} />
    </SpecimenGrid>
  )
}
