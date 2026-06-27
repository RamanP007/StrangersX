import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/seo'

export const alt = siteConfig.title
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1b0b3d 0%, #0a0a0b 55%, #2a0a33 100%)',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 44 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
            }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
              <circle cx="9" cy="12" r="5.4" />
              <circle cx="15" cy="12" r="5.4" />
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 0, fontSize: 40, fontWeight: 700 }}>
            <div>Stranger</div>
            <div style={{ color: '#a78bfa' }}>X</div>
          </div>
        </div>

        <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.05, maxWidth: 920 }}>
          Say hi to someone new.
        </div>

        <div style={{ fontSize: 30, color: '#a1a1aa', marginTop: 28, maxWidth: 840, lineHeight: 1.4 }}>
          Anonymous text and video chat with friendly strangers around the world — no sign-up required.
        </div>
      </div>
    ),
    { ...size },
  )
}
