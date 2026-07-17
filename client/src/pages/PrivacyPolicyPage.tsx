import { useNavigate } from 'react-router-dom';

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-gray-800 mb-2">{number}. {title}</h2>
      <hr className="border-gray-100 mb-3" />
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed">{children}</p>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-700 mt-3 mb-1">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 leading-relaxed">{children}</ul>;
}

function ELink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-green underline break-all">
      {children}
    </a>
  );
}

function MailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="text-brand-green underline break-all">{email}</a>
  );
}

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-4 max-w-lg mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer mb-3 transition-colors"
        >
          ‹ Back
        </button>
        <h1 className="text-lg font-extrabold text-gray-800">Privacy Policy</h1>
        <p className="text-xs text-gray-600 mt-0.5">Slovak for Foreigners · Last updated: 15 July 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full px-4 py-6 pb-36">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-6 space-y-7">

          <P>
            This Privacy Policy explains what personal data <strong>Slovak for Foreigners</strong>
            {' '}("we", "us", the "app") processes, why, and the rights you have. We are built around
            data minimisation: we collect as little as possible, identify you by a chosen nickname
            rather than your real name, and never sell your data.
          </P>

          <Section number={1} title="Who We Are (Data Controller)">
            <P>
              Slovak for Foreigners (also "Slovak4Foreigners", "S4F") is a language-learning application
              that helps foreigners in Slovakia learn Slovak and handle daily life. The data controller is:
            </P>
            <Ul>
              <li><strong>Mgr. Youssoupha Traore</strong> — sole trader (živnostník), IČO 55111432</li>
              <li>Martinčekova 780/12, 821 09 Bratislava – Ružinov, Slovak Republic</li>
              <li><strong>Website:</strong> <ELink href="https://www.slovakforforeigners.eu">www.slovakforforeigners.eu</ELink></li>
              <li><strong>Contact:</strong> <MailLink email="contact@slovakforforeigners.eu" /></li>
            </Ul>
            <P>
              Full operator identification is in our{' '}
              <button type="button" onClick={() => navigate('/legal')} className="text-brand-green underline cursor-pointer">Legal Notice</button>.
            </P>
          </Section>

          <Section number={2} title="Age Requirement">
            <P>
              You must be at least <strong>16 years old</strong> to use this app, in line with the GDPR
              and Slovak law on consent to data processing. We do not knowingly collect data from anyone
              under 16; if we learn that we have, we will delete the account and its data promptly. If you
              believe a child has used the app, contact <MailLink email="contact@slovakforforeigners.eu" />.
            </P>
          </Section>

          <Section number={3} title="What Data We Collect">
            <SubHeading>When you sign in with Google</SubHeading>
            <P>
              We request the <strong>minimum</strong> Google scope — your <strong>email address</strong> only.
              We do <strong>not</strong> receive or store your Google name, profile photo, contacts, Gmail,
              Drive, or calendar. Google also provides us a technical account identifier used to link your
              progress to your account.
            </P>

            <SubHeading>Your identity in the app</SubHeading>
            <P>
              You are identified by a <strong>self-chosen nickname (alias)</strong> and a snail avatar —
              not your real name. We store the alias and a history of alias changes.
            </P>

            <SubHeading>When you use the app</SubHeading>
            <Ul>
              <li><strong>Learning progress</strong> — lessons completed, XP, streaks, lesson-strength scores, Snail Race results, blocks passed</li>
              <li><strong>Usage &amp; session data</strong> — session start/end times, duration, and your general <strong>device type</strong> (e.g. mobile/desktop), used for reliability and to keep your progress in sync</li>
            </Ul>

            <SubHeading>In-person session registration</SubHeading>
            <P>
              If you indicate interest in an in-person session, we record <strong>only that your account
              expressed interest</strong> (an account link and a timestamp). We do <strong>not</strong>
              collect your name, phone number, or any separate personal details for this.
            </P>

            <SubHeading>Voice (speaking exercises)</SubHeading>
            <P>
              In pronunciation exercises we process short <strong>voice recordings</strong> to score your
              speaking. This is covered in section 4. We do not keep the audio.
            </P>

            <SubHeading>When you report a problem</SubHeading>
            <P>
              If you use the in-app <strong>"Report a problem"</strong> button, we store your message, the
              category, your alias, and a few <strong>technical details</strong> (the screen you were on,
              your device/browser, and the app version) so we can diagnose and fix the issue. If you're
              signed in we link it to your account so we can reply; if you're a guest, you may optionally
              add an email so we can get back to you. This support data is stored with Supabase (section 6)
              and kept only as long as needed to resolve the request.
            </P>

            <SubHeading>Gender &amp; country of origin — anonymous only</SubHeading>
            <P>
              Some exercises adapt Slovak grammar to your gender and country. We handle these as
              <strong> anonymous statistics only</strong>: we keep an aggregate count (e.g. "how many
              learners are from each country") that is <strong>not linked to you</strong>, and your own
              selection is stored <strong>locally on your device</strong> for personalisation — it is
              never sent to or stored on our servers against your account.
            </P>
          </Section>

          <Section number={4} title="Voice &amp; Speech Recognition">
            <P>
              When you use a speaking exercise and tap the microphone, a short audio clip of your speech is
              sent — through our secure server function — to <strong>OpenAI</strong> for automatic
              transcription (speech-to-text), so we can compare what you said to the target phrase.
            </P>
            <Ul>
              <li>Only the resulting <strong>text transcript</strong> is returned to us; we do <strong>not</strong> store the audio.</li>
              <li>OpenAI processes the audio on servers in the <strong>United States</strong> (see section 6 on international transfers).</li>
              <li>This happens only when you actively start a recording. If you prefer not to, you can use the "Can't speak?" option to continue by typing.</li>
            </Ul>
          </Section>

          <Section number={5} title="How We Use Your Data &amp; Anonymous Statistics">
            <SubHeading>We use your personal data to</SubHeading>
            <Ul>
              <li><strong>Provide the service</strong> — save your progress so it persists across devices and sessions</li>
              <li><strong>Personalise learning</strong> — show your alias, level and streak, and adapt exercises</li>
              <li><strong>Score speaking exercises</strong> — via the voice transcription described above</li>
              <li><strong>Keep the app reliable and secure</strong> — using session and device-type data</li>
            </Ul>

            <SubHeading>Anonymous statistics</SubHeading>
            <P>
              To understand and improve the app we use <strong>aggregated, anonymous</strong> information
              that does not identify you:
            </P>
            <Ul>
              <li><strong>Vercel Analytics</strong> — privacy-friendly, cookieless usage statistics (e.g. page views), collected in aggregate</li>
              <li><strong>Learner demographics</strong> — anonymous counts of gender and country of origin, not linked to any account (see section 3)</li>
            </Ul>

            <SubHeading>What we do NOT do</SubHeading>
            <Ul>
              <li>We do <strong>not</strong> sell or rent your personal data</li>
              <li>We do <strong>not</strong> use profiling or automated decision-making that has legal or similar effects on you</li>
              <li>We do <strong>not</strong> run advertising or share your data with advertisers</li>
              <li>We do <strong>not</strong> currently send any marketing, notifications, or reminder emails. The "streak reminders" toggle only stores a preference on your device; if we ever activate reminders we will ask for your explicit opt-in first and update this policy.</li>
            </Ul>
          </Section>

          <Section number={6} title="Where Your Data Is Stored &amp; International Transfers">
            <P>
              Your account and progress data are stored with <strong>Supabase</strong> on servers in
              <strong> London, United Kingdom</strong>. The UK is a "third country" outside the EEA but is
              recognised by the European Commission as providing an <strong>adequate</strong> level of data
              protection (adequacy decision), so your data remains protected to EU standards.
            </P>
            <P>
              Two features involve transfers to the <strong>United States</strong>:
            </P>
            <Ul>
              <li><strong>OpenAI</strong> — voice transcription for speaking exercises</li>
              <li><strong>Google</strong> — sign-in (authentication)</li>
            </Ul>
            <P>
              These transfers are protected by appropriate safeguards under the GDPR — such as the
              European Commission's <strong>Standard Contractual Clauses</strong> and/or the EU–US Data
              Privacy Framework. Data in transit is encrypted with HTTPS/TLS, and data at rest is
              encrypted by our infrastructure providers.
            </P>
          </Section>

          <Section number={7} title="Legal Basis for Processing (GDPR Art. 6)">
            <Ul>
              <li><strong>Performance of a contract (Art. 6(1)(b))</strong> — creating your account, saving progress, and running the exercises you use (including voice transcription when you start it)</li>
              <li><strong>Legitimate interests (Art. 6(1)(f))</strong> — keeping the app secure and reliable, and improving it using aggregated, anonymous statistics</li>
              <li><strong>Consent (Art. 6(1)(a))</strong> — for any optional feature that requires it (e.g. reminders, if we activate them). You can withdraw consent at any time</li>
            </Ul>
            <P>
              We do not collect special-category data. Gender and country of origin are handled as
              anonymous statistics only (section 3) and are not stored against your account.
            </P>
          </Section>

          <Section number={8} title="How Long We Keep Your Data">
            <Ul>
              <li><strong>While your account exists</strong> — we keep your account and progress data so the service works</li>
              <li><strong>When you delete your account</strong> — all your personal data (account, progress, sessions, alias history, in-person registration links) is deleted <strong>immediately</strong>, and in any event within 30 days</li>
              <li><strong>Voice audio</strong> — not stored; only a transient transcript is processed</li>
              <li><strong>Anonymous statistics</strong> — aggregate counts and analytics contain no personal data and may be retained</li>
            </Ul>
          </Section>

          <Section number={9} title="Your Rights (GDPR)">
            <P>As a person in the EU/EEA you have the right to:</P>
            <Ul>
              <li><strong>Access &amp; portability</strong> — download a machine-readable copy of your data at any time via <strong>Profile → Your data → "Download my data"</strong>, or by contacting us</li>
              <li><strong>Erasure</strong> — delete your account and all associated data via <strong>Profile → Delete account</strong></li>
              <li><strong>Rectification</strong> — ask us to correct your alias by contacting us from your account; gender/country choices live on your device and can be changed at any time</li>
              <li><strong>Restriction &amp; objection</strong> — object to or restrict processing based on legitimate interests</li>
              <li><strong>Withdraw consent</strong> — where processing is based on consent</li>
            </Ul>
            <P>
              To exercise any right, contact <strong><MailLink email="contact@slovakforforeigners.eu" /></strong>.
              We will respond within one month.
            </P>
            <P>
              You also have the right to lodge a complaint with the Slovak supervisory authority:
              <strong> Úrad na ochranu osobných údajov SR</strong>, Hraničná 12, 820 07 Bratislava 27,{' '}
              <ELink href="https://dataprotection.gov.sk">dataprotection.gov.sk</ELink>.
            </P>
          </Section>

          <Section number={10} title="Cookies &amp; Local Storage">
            <P>
              We do <strong>not</strong> use advertising or third-party tracking cookies. Our analytics
              (Vercel) are cookieless. We use your browser's <strong>local storage</strong> for essential
              and preference purposes:
            </P>
            <Ul>
              <li>Keeping you signed in between sessions</li>
              <li>Saving progress if you use the app without an account (guest mode)</li>
              <li>Remembering your consent, dismissed prompts, and settings</li>
              <li>Storing your gender/country choice on your device to personalise Slovak grammar (never sent to us)</li>
            </Ul>
            <P>
              During Google sign-in, Google may set cookies on its own domain. You can clear local storage
              at any time in your browser settings; doing so will sign you out and may remove locally
              saved guest progress.
            </P>
          </Section>

          <Section number={11} title="Google Sign-In">
            <Ul>
              <li>You authenticate directly with Google — we never see your Google password</li>
              <li>We receive only your <strong>email address</strong> (and a technical account identifier)</li>
              <li>You can revoke our access anytime at <ELink href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</ELink></li>
            </Ul>
          </Section>

          <Section number={12} title="Service Providers (Processors)">
            <P>We rely on the following providers, who process data on our behalf under data-processing terms:</P>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-100 rounded-tl-lg">Provider</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-100">Purpose</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-100">Region</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-100 rounded-tr-lg">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { service: 'Supabase', purpose: 'Database, authentication, storage', region: 'UK (London)', link: 'https://supabase.com/privacy', label: 'supabase.com/privacy' },
                    { service: 'Vercel', purpose: 'Hosting, CDN, anonymous analytics', region: 'EU / global', link: 'https://vercel.com/legal/privacy-policy', label: 'vercel.com/legal/privacy-policy' },
                    { service: 'Google', purpose: 'Sign-in (OAuth)', region: 'EU / US', link: 'https://policies.google.com/privacy', label: 'policies.google.com/privacy' },
                    { service: 'OpenAI', purpose: 'Voice-to-text for speaking exercises', region: 'US', link: 'https://openai.com/policies/privacy-policy', label: 'openai.com/policies/privacy-policy' },
                    { service: 'Zoho Mail', purpose: 'Email correspondence', region: 'EU', link: 'https://www.zoho.com/privacy.html', label: 'zoho.com/privacy' },
                  ].map(({ service, purpose, region, link, label }, i, arr) => (
                    <tr key={service} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className={`px-3 py-2 font-semibold text-gray-700 border border-gray-100 ${i === arr.length - 1 ? 'rounded-bl-lg' : ''}`}>{service}</td>
                      <td className="px-3 py-2 text-gray-600 border border-gray-100">{purpose}</td>
                      <td className="px-3 py-2 text-gray-600 border border-gray-100 whitespace-nowrap">{region}</td>
                      <td className={`px-3 py-2 border border-gray-100 ${i === arr.length - 1 ? 'rounded-br-lg' : ''}`}>
                        <ELink href={link}>{label}</ELink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Lesson audio you hear in the app is pre-generated content and does not involve your personal data.
            </P>
          </Section>

          <Section number={13} title="Data Security">
            <P>
              We protect your data with encryption in transit (HTTPS/TLS) and at rest, database
              row-level security so each account can only access its own data, authenticated access
              controls, and by minimising what we collect in the first place.
            </P>
          </Section>

          <Section number={14} title="Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. We will post the updated policy here
              with a new "Last updated" date, and for material changes we will notify users in the app.
            </P>
          </Section>

          <Section number={15} title="Contact Us">
            <P>For any privacy question, request, or complaint:</P>
            <P><strong>Email:</strong> <MailLink email="contact@slovakforforeigners.eu" /></P>
            <P>We review all correspondence and respond within one month.</P>
          </Section>

        </div>
      </div>
    </div>
  );
}
