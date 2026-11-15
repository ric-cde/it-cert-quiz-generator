import { CodeBlock } from '@/components/CodeBlock'
import { Specimen } from '../kit'

const JAVA_SAMPLE = `public record Point(int x, int y) {
    // Compact constructor: validates before the fields are assigned
    public Point {
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("Negative: " + x + ", " + y);
        }
    }

    static Point origin() { return new Point(0, 0); }
}`
const LONG_LINE = `var message = Stream.of("a", "very", "long", "line", "that", "keeps", "going", "well", "past", "the", "edge", "of", "the", "block").collect(Collectors.joining(" "));`
export function CodeBlocks() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Specimen label="Java" className="md:col-span-2">
        <CodeBlock code={JAVA_SAMPLE} language="java" />
      </Specimen>
      <Specimen label="Long lines scroll">
        <CodeBlock code={LONG_LINE} language="java" />
      </Specimen>
      <Specimen label="No language given">
        <CodeBlock code={'Exception in thread "main"\njava.lang.NullPointerException'} />
      </Specimen>
      <Specimen label="TypeScript">
        <CodeBlock code={'const total: number = items.reduce((sum, x) => sum + x.price, 0)'} language="ts" />
      </Specimen>
      <Specimen label="SQL">
        <CodeBlock code={"SELECT name FROM users WHERE role = 'admin' -- OutSystems aggregates"} language="sql" />
      </Specimen>
    </div>
  )
}
