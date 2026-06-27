'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import type { Message } from '@/types'
import { Send } from './icons'

interface Props {
  messages: Message[]
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatBox({ messages, onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text || disabled) return
    onSend(text)
    setInput('')
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Say hello to your stranger</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed animate-fade-in
              ${msg.from === 'me'
                ? 'rounded-br-sm bg-primary text-primary-foreground'
                : 'rounded-bl-sm bg-muted text-foreground'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={disabled}
            placeholder={disabled ? 'Connect to a stranger to chat…' : 'Type a message…'}
            rows={1}
            className="input max-h-32 flex-1 resize-none disabled:opacity-50"
          />
          <button onClick={send} disabled={disabled || !input.trim()}
            className="btn h-[42px] w-[42px] flex-shrink-0 p-0" aria-label="Send message">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
