'use client'

import { useEffect, useState } from 'react'

export function AgeGate() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('ageVerified')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('ageVerified', '1')
    setVisible(false)
  }

  function decline() {
    window.location.href = 'https://www.google.com'
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-8 text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border text-xl font-bold">
          16+
        </div>

        <h1 className="mb-3 text-2xl font-semibold tracking-tight">Quick age check</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          This platform is intended for people aged{' '}
          <span className="font-medium text-foreground">16 years or older</span>. By entering you confirm
          you meet this requirement and agree to our{' '}
          <a href="/terms" target="_blank" className="text-primary underline-offset-2 hover:underline">Terms</a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" className="text-primary underline-offset-2 hover:underline">Privacy Policy</a>.
        </p>

        <div className="flex flex-col gap-3">
          <button onClick={accept} className="btn w-full py-3">I am 16 or older — Enter</button>
          <button onClick={decline} className="btn-outline w-full py-3">I am under 16 — Leave</button>
        </div>
      </div>
    </div>
  )
}
