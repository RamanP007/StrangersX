// Normalize a site URL so `new URL(...)` (used by metadataBase) never throws.
// Accepts values with or without a scheme, e.g. "example.com" → "https://example.com".
function normalizeSiteUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:3000'
  let url = (raw ?? '').trim()
  if (!url) return fallback
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  // Validate; fall back if still unparseable.
  try {
    const u = new URL(url)
    return u.origin
  } catch {
    return fallback
  }
}

export const siteConfig = {
  name: 'StrangerX',
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  title: 'StrangerX — Chat with Strangers, Anonymously',
  description:
    'StrangerX connects you with a friendly stranger anywhere in the world for instant text or video chat. No sign-up needed, completely anonymous, and your conversations are never stored.',
  keywords: [
    'chat with strangers',
    'random chat',
    'anonymous chat',
    'talk to strangers',
    'omegle alternative',
    'video chat with strangers',
    'meet new people',
    'random video chat',
    'free chat',
    'StrangerX',
  ],
  twitter: '@strangerx',
  locale: 'en_US',
} as const
