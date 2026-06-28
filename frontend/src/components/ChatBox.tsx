'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import type { Message, ReplyRef } from '@/types'
import { Send, Smile, Reply, X } from './icons'

interface Props {
  messages: Message[]
  onSend: (text: string, reply?: ReplyRef) => void
  onTyping?: (isTyping: boolean) => void
  partnerTyping?: boolean
  disabled: boolean
}

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎',
  '🤩', '🥳', '😜', '🤔', '😏', '😴', '😢', '😭',
  '😡', '😱', '🥺', '😬', '🙄', '😇', '🤗', '🤭',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '🤝',
  '🔥', '✨', '⭐', '💯', '❤️', '🧡', '💛', '💚',
  '💙', '💜', '🖤', '💔', '💋', '🎉', '👀', '😅',
]

export function ChatBox({ messages, onSend, onTyping, partnerTyping = false, disabled }: Props) {
  const [input, setInput] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiWrapRef = useRef<HTMLDivElement>(null)
  const typingActive = useRef(false)
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partnerTyping])

  // Close emoji picker on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function stopTyping() {
    clearTimeout(typingTimeout.current)
    if (typingActive.current) {
      typingActive.current = false
      onTyping?.(false)
    }
  }

  function handleChange(value: string) {
    setInput(value)
    if (disabled) return
    if (value.trim()) {
      if (!typingActive.current) {
        typingActive.current = true
        onTyping?.(true)
      }
      clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(stopTyping, 1500)
    } else {
      stopTyping()
    }
  }

  function send() {
    const text = input.trim()
    if (!text || disabled) return
    const reply: ReplyRef | undefined = replyingTo
      ? { text: replyingTo.text, mine: replyingTo.from === 'me' }
      : undefined
    onSend(text, reply)
    setInput('')
    setReplyingTo(null)
    setShowEmoji(false)
    stopTyping()
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function addEmoji(emoji: string) {
    setInput(prev => prev + emoji)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && !partnerTyping && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Say hello to your stranger</p>
          </div>
        )}

        {messages.map(msg => {
          const mine = msg.from === 'me'
          return (
            <div key={msg.id} className={`group flex items-center gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
              {mine && (
                <ReplyButton onClick={() => setReplyingTo(msg)} />
              )}

              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed animate-fade-in
                ${mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-foreground'}`}>
                {msg.reply && (
                  <div className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs
                    ${mine ? 'border-white/60 bg-white/15' : 'border-primary bg-background/50'}`}>
                    <p className={`font-medium ${mine ? 'text-white/90' : 'text-primary'}`}>
                      {msg.reply.mine ? 'You' : 'Stranger'}
                    </p>
                    <p className={`truncate ${mine ? 'text-white/75' : 'text-muted-foreground'}`}>
                      {msg.reply.text}
                    </p>
                  </div>
                )}
                <span className="whitespace-pre-wrap break-words">{msg.text}</span>
              </div>

              {!mine && (
                <ReplyButton onClick={() => setReplyingTo(msg)} />
              )}
            </div>
          )
        })}

        {/* Typing indicator */}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3">
              {[0, 1, 2].map(i => (
                <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-foreground/50"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="mx-3 flex items-center gap-2 rounded-t-lg border-l-2 border-primary bg-muted/60 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary">
              Replying to {replyingTo.from === 'me' ? 'yourself' : 'Stranger'}
            </p>
            <p className="truncate text-xs text-muted-foreground">{replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} aria-label="Cancel reply"
            className="text-muted-foreground transition-colors hover:text-foreground">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="relative flex items-end gap-2">
          {/* Emoji */}
          <div ref={emojiWrapRef} className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji(s => !s)}
              disabled={disabled}
              aria-label="Emojis"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-border
                         text-muted-foreground transition-colors hover:bg-muted hover:text-foreground
                         disabled:opacity-50"
            >
              <Smile size={20} />
            </button>

            {showEmoji && (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-[280px] rounded-xl border border-border
                              bg-card p-2 shadow-xl animate-fade-in">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => addEmoji(e)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => handleChange(e.target.value)}
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

function ReplyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Reply"
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground
                 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
    >
      <Reply size={15} />
    </button>
  )
}
