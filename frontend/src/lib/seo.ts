export const siteConfig = {
  name: 'StrangerX',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
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
