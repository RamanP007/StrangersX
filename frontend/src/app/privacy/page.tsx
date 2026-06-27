import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How StrangerX handles your data: chats are never stored, guests stay anonymous, and you can delete your account anytime.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy · StrangerX',
    description: 'Chats are never stored. Guests stay anonymous. Your privacy comes first.',
    url: '/privacy',
  },
}

const SECTIONS = [
  { title: '1. Information We Collect', body: 'When you sign in with Google, we receive your Google account ID, email address, display name, and profile picture. This information is stored to associate your account with your chat preferences. Guest users receive only an anonymous session token — no personal information is collected.' },
  { title: '2. Chat Data', body: 'Conversations on StrangerX are ephemeral. We do not log, store, or archive the content of any chat session. Once a chat ends, the messages are permanently deleted from memory.' },
  { title: '3. Session Data', body: 'We use Redis to temporarily hold session tokens for authentication. These tokens expire after 24 hours. We use cookies strictly for session management — no tracking or advertising cookies.' },
  { title: '4. Reports', body: 'When you submit a report, we store the reason, an optional note, and the session identifier of the reported user. This data is used solely for moderation.' },
  { title: '5. Third-Party Services', body: 'We use Google OAuth for authentication. Google’s privacy policy applies to the authentication process. We do not share your data with any other third parties.' },
  { title: '6. Data Retention', body: 'Account data is retained until you request deletion, which you can do from your settings. Guest session tokens expire automatically within 24 hours.' },
  { title: '7. Contact', body: 'For privacy concerns or data deletion requests, please reach out through the platform.' },
]

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-28">
        <div className="card space-y-6 p-8">
          <div>
            <div className="mb-4 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Legal</div>
            <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
            {SECTIONS.map(s => (
              <div key={s.title}>
                <h2 className="mb-2 font-medium text-foreground">{s.title}</h2>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
