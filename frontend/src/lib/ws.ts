// Builds a WebSocket URL from NEXT_PUBLIC_SOCKET_URL that is safe on HTTPS pages.
// - Strips any scheme and trailing slashes from the configured host.
// - Uses `wss` when the page is served over HTTPS (avoids "Mixed Content" blocks),
//   otherwise `ws`.
export function wsUrl(path: string): string {
  const raw = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080').trim()
  const host = raw
    .replace(/^(https?|wss?):\/\//i, '') // drop scheme
    .replace(/\/+$/, '')                 // drop trailing slash(es)

  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const scheme = secure ? 'wss' : 'ws'
  const p = path.startsWith('/') ? path : `/${path}`
  return `${scheme}://${host}${p}`
}
