'use client'

import { useState } from 'react'
import { AuthButtons } from './AuthButtons'
import { Video, Bolt, Incognito, ArrowRight } from './icons'

const POINTS = [
  { icon: Video, text: 'See and hear your match in real time' },
  { icon: Bolt, text: 'Connect with someone new in seconds' },
  { icon: Incognito, text: 'No profiles, no pressure — skip anytime' },
]

export function VideoChatPromo() {
  const [signup, setSignup] = useState(false)

  return (
    <div className="card mx-auto max-w-3xl overflow-hidden p-8 sm:p-10">
      <div className="grid items-center gap-8 sm:grid-cols-2">
        {/* Copy */}
        <div className="text-center sm:text-left">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Video size={24} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Prefer to go face to face?
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Turn on your camera and meet someone new, live. Our video chat pairs you with a
            friendly stranger instantly — genuine, spontaneous conversation, the moment you’re ready.
          </p>

          <ul className="mt-6 space-y-2.5">
            {POINTS.map(p => {
              const Icon = p.icon
              return (
                <li key={p.text} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-border text-primary">
                    <Icon size={15} />
                  </span>
                  <span className="text-foreground">{p.text}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Action */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-muted/40 p-6">
          {!signup ? (
            <>
              <button onClick={() => setSignup(true)} className="btn w-full py-3.5 text-base">
                <Video size={18} />
                Video chat
                <ArrowRight size={16} />
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Free · No download · Camera on only when you start
              </p>
            </>
          ) : (
            <>
              <p className="text-center text-sm font-medium">Sign in to start your video chat</p>
              <AuthButtons intent="video" stacked googleOnly />
              <p className="text-center text-xs text-muted-foreground">Video chat requires a free account</p>
              <button onClick={() => setSignup(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
