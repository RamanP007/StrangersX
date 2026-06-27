type Cell = { label: string; tone: 'good' | 'warn' | 'bad' }

const COLS = ['StrangerX', 'Chatroulette', 'Monkey', 'OmeTV']

const ROWS: { feature: string; cells: Cell[] }[] = [
  { feature: 'Free random video chat', cells: [g('Yes'), w('Limited'), g('Yes'), g('Yes')] },
  { feature: 'Works in the browser', cells: [g('Yes'), g('Yes'), b('App only'), g('Yes')] },
  { feature: 'No signup required', cells: [g('Yes'), g('Yes'), b('Required'), g('Yes')] },
  { feature: 'Text + video chat', cells: [g('Yes'), b('Video only'), b('Video only'), g('Yes')] },
  { feature: 'Active moderation', cells: [g('Yes'), w('Basic'), g('Yes'), w('Basic')] },
  { feature: 'Interest matching', cells: [g('Yes'), b('No'), b('No'), w('Limited')] },
  { feature: 'No ads', cells: [g('Yes'), b('Has ads'), b('Has ads'), b('Has ads')] },
  { feature: 'Light & dark mode', cells: [g('Yes'), b('No'), b('No'), b('No')] },
]

function g(label: string): Cell { return { label, tone: 'good' } }
function w(label: string): Cell { return { label, tone: 'warn' } }
function b(label: string): Cell { return { label, tone: 'bad' } }

const toneClass: Record<Cell['tone'], string> = {
  good: 'text-emerald-500',
  warn: 'text-amber-500',
  bad: 'text-red-500',
}

export function ComparisonTable() {
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        How StrangerX compares
      </h2>
      <p className="mx-auto mt-3 mb-10 max-w-lg text-center text-muted-foreground">
        Omegle shut down in 2023. Here’s how we stack up against today’s alternatives.
      </p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4 text-left font-medium text-muted-foreground">Feature</th>
                {COLS.map((c, i) => (
                  <th
                    key={c}
                    className={`px-5 py-4 text-left font-semibold ${i === 0 ? 'text-primary' : 'text-foreground'}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr
                  key={row.feature}
                  className={`border-b border-border last:border-0 ${ri % 2 === 1 ? 'bg-muted/30' : ''}`}
                >
                  <td className="px-5 py-3.5 text-foreground">{row.feature}</td>
                  {row.cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-5 py-3.5 font-medium ${toneClass[cell.tone]} ${ci === 0 ? 'bg-primary/5' : ''}`}
                    >
                      {cell.label}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
