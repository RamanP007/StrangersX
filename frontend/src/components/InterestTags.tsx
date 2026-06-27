'use client'

import { useState, KeyboardEvent } from 'react'
import { X } from './icons'

const SUGGESTED_TAGS = ['music', 'gaming', 'movies', 'travel', 'fitness', 'art', 'tech', 'anime', 'fashion', 'cooking']

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
}

export function InterestTags({ value, onChange }: Props) {
  const [input, setInput] = useState('')

  function add(tag: string) {
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!clean || value.includes(clean) || value.length >= 8) return
    onChange([...value, clean])
    setInput('')
  }

  function remove(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="w-full">
      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map(tag => (
            <span key={tag} className="chip">
              {tag}
              <button onClick={() => remove(tag)} aria-label={`Remove ${tag}`}
                className="text-muted-foreground transition-colors hover:text-foreground">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        placeholder="Add an interest and press Enter…"
        maxLength={30}
        className="input"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_TAGS.filter(t => !value.includes(t)).slice(0, 6).map(tag => (
          <button key={tag} onClick={() => add(tag)}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            + {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
