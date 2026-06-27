import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The rules for using StrangerX: age requirements, acceptable use, conduct, and account terms.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms & Conditions · StrangerX',
    description: 'Age requirements, acceptable use, and account terms for StrangerX.',
    url: '/terms',
  },
}

const SECTIONS = [
  { title: '1. Age Requirement', body: 'You must be at least 16 years old to use StrangerX. By accessing this platform, you confirm that you meet this requirement. Users found to be under 16 will be permanently removed.' },
  { title: '2. Acceptable Use', body: 'You agree to use StrangerX for lawful purposes only. You may not share, solicit, or distribute illegal content, child sexual abuse material (CSAM), non-consensual content, or engage in targeted harassment. Violators will be reported to relevant authorities.' },
  { title: '3. Anonymity & Conduct', body: 'While our platform is anonymous, this does not absolve you of legal responsibility for your actions. Treat other users with basic dignity. Repeated violations reported through our system may result in bans.' },
  { title: '4. No Warranties', body: 'StrangerX is provided "as is" without warranty of any kind. We do not guarantee uninterrupted service, match quality, or user behavior. Use the platform at your own discretion.' },
  { title: '5. Limitation of Liability', body: 'StrangerX and its operators are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform, including content shared by other users.' },
  { title: '6. Modifications', body: 'We reserve the right to modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the revised Terms.' },
  { title: '7. Termination', body: 'We reserve the right to terminate or restrict access to accounts or sessions that violate these Terms, at our sole discretion, without prior notice.' },
]

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-28">
        <div className="card space-y-6 p-8">
          <div>
            <div className="mb-4 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Legal</div>
            <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
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
