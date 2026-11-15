import { useState } from 'react'
import { DataTable } from '@/components/DataTable'
import type { InspectorRow, SortDir } from '@shared/inspector'
import { Specimen } from '../kit'

const TABLE_SAMPLE: InspectorRow[] = [
  { id: 1, bodyMd: 'A short value', isCorrect: true, flaggedAt: null, questionIds: [1, 2, 3] },
  {
    id: 2,
    bodyMd:
      'A long value folds away, so one big question or draft cannot push the rest of the table off the screen. Open it to read everything that was stored.',
    isCorrect: false,
    flaggedAt: '2026-11-04T09:30:00.000Z',
    questionIds: [],
  },
]
export function DataTables() {
  const [sort, setSort] = useState('id')
  const [dir, setDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const columns = Object.keys(TABLE_SAMPLE[0]!)

  const rows = [...TABLE_SAMPLE].sort((a, b) => {
    const order = String(a[sort]).localeCompare(String(b[sort]), undefined, { numeric: true })
    return dir === 'asc' ? order : -order
  })

  return (
    <>
      <Specimen label="With rows: null, booleans, JSON and long text. Click a heading to sort.">
        <DataTable
          label="Sample rows"
          columns={columns}
          rows={rows}
          sort={sort}
          dir={dir}
          onSort={(column, nextDir) => {
            setSort(column)
            setDir(nextDir)
          }}
          page={page}
          pageCount={3}
          total={42}
          onPage={setPage}
        />
      </Specimen>
      <Specimen label="Empty">
        <DataTable
          label="Empty sample"
          columns={columns}
          rows={[]}
          sort="id"
          dir="asc"
          onSort={() => {}}
          page={1}
          pageCount={1}
          total={0}
          onPage={() => {}}
        />
      </Specimen>
    </>
  )
}
