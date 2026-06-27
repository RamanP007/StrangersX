import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { AuthButtons } from '@/components/AuthButtons'
import { VideoChatPromo } from '@/components/VideoChatPromo'
import { BrowserMockup } from '@/components/BrowserMockup'
import { StartRandomChatButton } from '@/components/StartRandomChatButton'
import { ComparisonTable } from '@/components/ComparisonTable'
import { Faq } from '@/components/Faq'
import { Incognito, Bolt, Target, Lock, Check } from '@/components/icons'

const SHOWCASE_POINTS = [
  'Open the site, click Start — you’re live in seconds',
  'Matched with people worldwide in real time',
  'Skip or report anytime — friendly and moderated',
  'No account, no download, no credit card',
  'Text or video — switch whenever you like',
]

const FEATURES = [
  { icon: Incognito, title: 'Completely anonymous', desc: 'No sign-up needed — hop in as a guest. We never ask who you are, and you stay a mystery too.' },
  { icon: Bolt, title: 'Instant matching', desc: 'One tap and you’re chatting. Finding a friendly face usually takes about a second.' },
  { icon: Target, title: 'Find your people', desc: 'Share a few interests and we’ll pair you with someone on the same wavelength.' },
  { icon: Lock, title: 'Privacy first', desc: 'Your chats disappear the moment you leave. Nothing is ever stored or shared.' },
]

const STEPS = [
  { n: 1, title: 'Pick how to chat', desc: 'Choose text or video, then match randomly or by the things you love.' },
  { n: 2, title: 'Get matched in seconds', desc: 'We’ll instantly connect you with a friendly stranger somewhere in the world.' },
  { n: 3, title: 'Say hello', desc: 'Talk as long as you like, skip anytime, and meet someone new whenever you want.' },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center px-4 pb-24 pt-36 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Meet someone new, right now
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Say hi to someone <span className="text-primary">new</span>.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Every great conversation starts with a simple hello. StrangerX connects you with a
            friendly stranger somewhere in the world — no accounts, no pressure, no judgement.
            Just real, spontaneous chats whenever you feel like talking.
          </p>

          <p className="mt-3 max-w-md text-base text-muted-foreground">
            Sign in with Google to keep your name, or jump straight in as a guest. It only takes a second.
          </p>

          <div className="mt-10">
            <AuthButtons />
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Free forever · No downloads · Works on any device
          </p>
        </section>

        {/* Showcase — Omegle alternative */}
        <section className="px-4 py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <BrowserMockup />

            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                RANDOM VIDEO CHAT
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                The Omegle alternative, reimagined.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                When Omegle shut down in 2023, millions lost their favourite way to meet strangers.
                StrangerX brings it back — the same thrill of meeting someone new, but faster,
                safer, and always free.
              </p>

              <ul className="mt-6 space-y-3">
                {SHOWCASE_POINTS.map(p => (
                  <li key={p} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check size={14} />
                    </span>
                    <span className="text-foreground">{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <StartRandomChatButton />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <p className="mx-auto mb-12 max-w-md text-center text-muted-foreground">
              Three simple steps and you’re talking to someone new.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {STEPS.map(s => (
                <div key={s.n} className="card card-interactive space-y-3 p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Why you’ll love StrangerX
            </h2>
            <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
              Built to be simple, friendly, and completely on your terms — your privacy always comes first.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(f => {
                const Icon = f.icon
                return (
                  <div key={f.title} className="card card-interactive group space-y-3 p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-primary transition-all duration-300 group-hover:scale-110 group-hover:border-primary/40 group-hover:bg-primary/5">
                      <Icon size={20} />
                    </div>
                    <h3 className="font-medium">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="px-4 py-16">
          <ComparisonTable />
        </section>

        {/* Video chat promo */}
        <section className="px-4 py-10">
          <VideoChatPromo />
        </section>

        {/* FAQ */}
        <section className="px-4 py-16">
          <Faq />
        </section>

        {/* CTA */}
        <section className="px-4 py-16">
          <div className="card mx-auto max-w-2xl p-10 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">Ready to meet someone new?</h2>
            <p className="mb-8 leading-relaxed text-muted-foreground">
              There’s always someone out there waiting to say hello. Start a conversation now —
              you might just make someone’s day (or your own).
            </p>
            <AuthButtons />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
