import { useState } from 'react'
import { RandomTile, SourceTile, Tile, TileGrid } from '@/components/Tile'
import { Specimen } from '../kit'

function InteractiveTiles({ progressStyle }: { progressStyle: 'bar' | 'squares' }) {
  const [random, setRandom] = useState(false)
  const [picked, setPicked] = useState<string[]>(['oop', 'boyarsky'])
  const [expanded, setExpanded] = useState(true)

  function toggle(id: string) {
    setRandom(false)
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }
  const tile = (
    id: string,
    title: string,
    correct: number,
    incorrect: number,
    total: number,
    origin?: 'official' | 'unofficial',
  ) => (
    <Tile
      key={id}
      title={title}
      origin={origin}
      count={total}
      progress={{ correct, incorrect, total }}
      selected={!random && picked.includes(id)}
      diminished={random}
      emphasis="unanswered"
      progressStyle={progressStyle}
      onClick={() => toggle(id)}
    />
  )

  return (
    <div className="space-y-4">
      <RandomTile
        selected={random}
        onClick={() => {
          setRandom((value) => !value)
          setPicked([])
        }}
      />
      <div>
        <h3 className={`mb-2 text-sm ${random ? 'text-ink-soft' : ''}`}>Categories</h3>
        <TileGrid>
          {tile('oop', 'Object-Oriented Programming', 18, 7, 42, 'official')}
          {tile('streams', 'Streams and Lambdas', 5, 9, 36, 'official')}
          {tile('concurrency', 'Concurrency', 0, 0, 24, 'official')}
          {tile('modules', 'Modules from an imported file', 12, 0, 12, 'unofficial')}
        </TileGrid>
      </div>
      <div>
        <h3 className={`mb-2 text-sm ${random ? 'text-ink-soft' : ''}`}>Sources</h3>
        <TileGrid>
          <SourceTile
            title="OCP Study Guide (Boyarsky)"
            icon="fox"
            count={120}
            progress={{ correct: 40, incorrect: 22, total: 120 }}
            chapterCount={3}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((value) => !value)}
            chapterHint={
              !random && picked.includes('boyarsky')
                ? 'All chapters are included. Pick some to narrow further.'
                : undefined
            }
            selected={!random && picked.includes('boyarsky')}
            diminished={random}
            emphasis="unanswered"
            progressStyle={progressStyle}
            onClick={() => toggle('boyarsky')}
          >
            {tile('ch1', 'Chapter 1: Building Blocks', 14, 3, 20)}
            {tile('ch2', 'Chapter 2: Operators', 6, 4, 20)}
            {tile('ch3', 'Chapter 3: Making Decisions', 0, 0, 20)}
          </SourceTile>
          <SourceTile
            title="Enthuware Practice Sets"
            icon="owl"
            count={200}
            progress={{ correct: 12, incorrect: 8, total: 200 }}
            chapterCount={4}
            expanded={false}
            selected={!random && picked.includes('enthuware')}
            diminished={random}
            emphasis="unanswered"
            progressStyle={progressStyle}
            onClick={() => toggle('enthuware')}
          />
        </TileGrid>
      </div>
    </div>
  )
}
export function Tiles() {
  const progress = { correct: 18, incorrect: 7, total: 42 }
  const none = { correct: 0, incorrect: 0, total: 0 }
  return (
    <>
      <Specimen label="Working example: click tiles, chapters and All sources. Status is Unanswered.">
        <InteractiveTiles progressStyle="bar" />
      </Specimen>
      <Specimen label="The same, with a square for each question">
        <InteractiveTiles progressStyle="squares" />
      </Specimen>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-x-3 gap-y-5">
        <Specimen label="Default">
          <Tile title="Concurrency" count={42} progress={progress} />
        </Specimen>
        <Specimen label="Hover">
          <Tile title="Concurrency" count={42} progress={progress} data-force="hover" />
        </Specimen>
        <Specimen label="Focus">
          <Tile title="Concurrency" count={42} progress={progress} data-force="focus" />
        </Specimen>
        <Specimen label="Selected">
          <Tile title="Concurrency" count={42} progress={progress} selected />
        </Specimen>
        <Specimen label="Included by another pick">
          <Tile title="Concurrency" count={42} progress={progress} included />
        </Specimen>
        <Specimen label="Official category">
          <Tile title="Concurrency" count={42} progress={progress} origin="official" />
        </Specimen>
        <Specimen label="Squares">
          <Tile title="Concurrency" count={42} progress={progress} progressStyle="squares" />
        </Specimen>
        <Specimen label="Squares, selected, status Unanswered">
          <Tile
            title="Concurrency"
            count={17}
            progress={progress}
            progressStyle="squares"
            emphasis="unanswered"
            selected
          />
        </Specimen>
        <Specimen label="Diminished (All sources is on)">
          <Tile title="Concurrency" count={42} progress={progress} diminished />
        </Specimen>
        <Specimen label="Diminished, nothing to add">
          <Tile title="Concurrency" count={0} progress={progress} diminished />
        </Specimen>
        <Specimen label="Nothing to add now (no box)">
          <Tile title="Concurrency" count={0} progress={progress} />
        </Specimen>
        <Specimen label="No questions">
          <Tile title="Concurrency" count={0} progress={none} empty />
        </Specimen>
      </div>
    </>
  )
}
