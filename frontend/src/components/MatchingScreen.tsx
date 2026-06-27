'use client'

import { Sonar } from './Sonar'

interface Props {
  onCancel: () => void
}

export function MatchingScreen({ onCancel }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-16">
      <Sonar size={84} />

      <div className="text-center">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Finding a stranger…</h2>
        <p className="text-sm text-muted-foreground">Connecting you with someone new</p>
      </div>

      <button onClick={onCancel} className="btn-outline px-8">Cancel</button>
    </div>
  )
}
