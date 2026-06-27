'use client'

import { useState } from 'react'
import { ChevronDown } from './icons'

const ITEMS = [
  {
    q: 'Is StrangerX free?',
    a: 'Completely. There’s no account required, no download, and no credit card — just open the site and start chatting.',
  },
  {
    q: 'Do I have to sign up?',
    a: 'No. You can jump straight in as a guest. Signing in with Google is optional and just lets you keep a username across visits.',
  },
  {
    q: 'Is it really anonymous?',
    a: 'Yes. We never store your conversations, and guests share no personal information. The moment you leave, the chat is gone.',
  },
  {
    q: 'Can I do video chat?',
    a: 'Yes — choose text or video, and switch anytime. Your camera only turns on when you start a video chat, and turns off the instant you leave.',
  },
  {
    q: 'How do you keep people safe?',
    a: 'You can skip to a new stranger instantly and report anyone in a tap. Reports feed our moderation so the community stays friendly.',
  },
  {
    q: 'What happened to Omegle?',
    a: 'Omegle shut down in November 2023. StrangerX is a modern alternative — the same thrill of meeting someone new, but faster, safer, and always free.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>

      <div className="space-y-3">
        {ITEMS.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={item.q} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <span className="font-medium">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
