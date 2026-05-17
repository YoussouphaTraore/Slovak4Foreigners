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

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-600 leading-relaxed">{children}</ol>;
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
        <p className="text-xs text-gray-400 mt-0.5">Slovak for Foreigners · Last updated: May 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full px-4 py-6 pb-36">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-6 space-y-7">

          <Section number={1} title="Who We Are">
            <P>
              Slovak for Foreigners (also referred to as "Slovak4Foreigners" and "S4F") is a language
              learning application designed to help foreigners living in Slovakia learn the Slovak
              language and navigate daily life in Slovakia.
            </P>
            <Ul>
              <li><strong>Website:</strong> <ELink href="https://www.slovakforforeigners.eu">www.slovakforforeigners.eu</ELink></li>
              <li><strong>Contact:</strong> <MailLink email="contact@slovakforforeigners.eu" /></li>
            </Ul>
          </Section>

          <Section number={2} title="Age Requirements">
            <P>
              This app is intended for users who meet the minimum age required by applicable EU and
              Slovak law to consent to the processing of their personal data. Under the GDPR and Slovak
              law this means you must be at least <strong>16 years of age</strong>.
            </P>
            <P>
              By using this app and providing your personal data, you confirm that you meet this
              requirement. We do not knowingly collect data from users under 16. If we become aware that
              a user is under the minimum age, we will delete their account and all associated data
              promptly.
            </P>
            <P>
              If you believe a child has used this app, please contact us at{' '}
              <MailLink email="contact@slovakforforeigners.eu" />.
            </P>
          </Section>

          <Section number={3} title="What Data We Collect">
            <P>We collect the minimum data necessary to provide the service.</P>

            <SubHeading>When you sign in with Google:</SubHeading>
            <Ul>
              <li>Your <strong>full name</strong> (as set in your Google account)</li>
              <li>Your <strong>email address</strong></li>
              <li>Your <strong>Google profile photo URL</strong> (used for your avatar in the app)</li>
            </Ul>
            <P>
              We do NOT access your Google contacts, Google Drive, Gmail, calendar, or any other Google
              service. We only request your basic profile information.
            </P>

            <SubHeading>When you use the app:</SubHeading>
            <Ul>
              <li>Your <strong>learning progress</strong> — which lessons you have completed, XP earned, streaks, lesson strength scores</li>
              <li>Your <strong>app preferences</strong> — streak reminder settings, display name</li>
              <li>Your <strong>session data</strong> — which dialogues you have practiced, Snail Race scores, reference cards unlocked</li>
              <li>Your <strong>device information</strong> — browser type, for technical support purposes only</li>
            </Ul>

            <SubHeading>When you register for an event:</SubHeading>
            <P>
              When we organise events (such as language meetups or workshops), you may be asked to fill
              in a registration form. In that case we collect:
            </P>
            <Ul>
              <li>Your <strong>name</strong></li>
              <li>Your <strong>email address</strong></li>
              <li>Any other details relevant to the specific event (such as language level or dietary requirements)</li>
            </Ul>
            <P>
              This data is used solely to organise and manage the event and is not used for any other
              purpose. We will not share your event registration data with third parties.
            </P>
          </Section>

          <Section number={4} title="How We Use Your Data">
            <P>We use your data to:</P>
            <Ol>
              <li><strong>Provide the service</strong> — save your progress so it persists across devices and sessions</li>
              <li><strong>Personalise your experience</strong> — show your name in the app, display your level and streak</li>
              <li><strong>Improve the app</strong> — understand which lessons are most used (aggregated, not individual tracking)</li>
              <li><strong>Send streak reminders</strong> — only if you have enabled this in your profile settings</li>
              <li><strong>Organise events</strong> — manage registrations and communicate event details to registered participants</li>
            </Ol>

            <SubHeading>Advertising</SubHeading>
            <P>
              We do not currently share your personal data with advertisers or use it for targeted
              advertising. We reserve the right to introduce advertising features in the future. If we
              do, we will update this Privacy Policy and notify users through the app before any such
              change takes effect. Any advertising will comply with applicable EU and Slovak law.
            </P>

            <SubHeading>What we do not do with your data:</SubHeading>
            <Ul>
              <li>We do not sell your personal data to third parties</li>
              <li>We do not currently use your data for profiling or automated decision-making</li>
              <li>We do not send marketing emails without your consent</li>
            </Ul>
          </Section>

          <Section number={5} title="Where Your Data Is Stored">
            <P>
              Your data is stored using <strong>Supabase</strong>, a database service with servers
              located in <strong>West Europe (London, United Kingdom)</strong>. This means your data is
              stored within the European Economic Area (EEA) and is subject to GDPR protections.
            </P>
            <P>
              Your data in transit is encrypted using HTTPS/TLS. Your data at rest is encrypted by
              Supabase's infrastructure.
            </P>
          </Section>

          <Section number={6} title="Legal Basis for Processing (GDPR)">
            <P>We process your personal data under the following legal bases:</P>
            <Ul>
              <li><strong>Contract performance</strong> — processing your name and email is necessary to provide you with a personalised account and saved progress</li>
              <li><strong>Legitimate interests</strong> — we have a legitimate interest in improving the app using aggregated usage data</li>
              <li><strong>Consent</strong> — for optional features such as streak reminder emails, we only process your data with your explicit consent, which you can withdraw at any time in Profile settings</li>
            </Ul>
          </Section>

          <Section number={7} title="How Long We Keep Your Data">
            <Ul>
              <li><strong>Active accounts:</strong> We keep your data for as long as you have an account with us</li>
              <li><strong>Inactive accounts:</strong> If your account has been inactive for 24 months we may delete it after attempting to notify you by email</li>
              <li><strong>Deleted accounts:</strong> When you delete your account, all personal data is deleted within 30 days</li>
              <li><strong>Event registration data:</strong> Deleted within 90 days after the event has taken place</li>
            </Ul>
          </Section>

          <Section number={8} title="Your Rights (GDPR)">
            <P>
              As a user in the European Union or European Economic Area, you have the following rights:
            </P>
            <Ul>
              <li><strong>Right to access</strong> — you can request a copy of all data we hold about you</li>
              <li><strong>Right to rectification</strong> — you can correct your display name in the Profile page at any time</li>
              <li><strong>Right to erasure</strong> — you can delete your account in the Profile page, which will delete all your personal data</li>
              <li><strong>Right to portability</strong> — you can request your data in a machine-readable format</li>
              <li><strong>Right to object</strong> — you can object to processing based on legitimate interests</li>
              <li><strong>Right to withdraw consent</strong> — you can turn off streak reminders in Profile settings at any time</li>
            </Ul>
            <P>
              To exercise any of these rights, contact us at:{' '}
              <strong><MailLink email="contact@slovakforforeigners.eu" /></strong>
            </P>
            <P>We review all correspondence and will respond as soon as reasonably possible.</P>
          </Section>

          <Section number={9} title="Cookies and Local Storage">
            <P>We use <strong>browser localStorage</strong> to:</P>
            <Ul>
              <li>Keep you signed in between sessions</li>
              <li>Save your progress if you use the app without an account (guest mode)</li>
              <li>Remember dismissed notifications and modal preferences</li>
            </Ul>
            <P>
              We do not currently use advertising cookies or third-party tracking cookies. If this
              changes in the future, we will update this policy and notify users.
            </P>
            <P>
              You can clear localStorage at any time through your browser settings. Note that clearing
              localStorage will sign you out and may remove locally saved progress if you are not signed
              in to an account.
            </P>
          </Section>

          <Section number={10} title="Google Sign-In">
            <P>
              When you sign in with Google we use Google OAuth 2.0. This means:
            </P>
            <Ul>
              <li>You authenticate directly with Google — we never see your Google password</li>
              <li>We only receive the data Google sends us (name, email, profile photo)</li>
              <li>You can revoke our access at any time at <ELink href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</ELink></li>
            </Ul>
          </Section>

          <Section number={11} title="Third-Party Services">
            <P>We use the following third-party services:</P>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-100 rounded-tl-lg">Service</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-100">Purpose</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-100 rounded-tr-lg">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { service: 'Supabase', purpose: 'Database and authentication', link: 'https://supabase.com/privacy', label: 'supabase.com/privacy' },
                    { service: 'Vercel', purpose: 'Website hosting', link: 'https://vercel.com/legal/privacy-policy', label: 'vercel.com/legal/privacy-policy' },
                    { service: 'Google OAuth', purpose: 'Sign-in service', link: 'https://policies.google.com/privacy', label: 'policies.google.com/privacy' },
                    { service: 'Zoho Mail', purpose: 'Email communication', link: 'https://www.zoho.com/privacy.html', label: 'zoho.com/privacy' },
                  ].map(({ service, purpose, link, label }, i, arr) => (
                    <tr key={service} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className={`px-3 py-2 font-semibold text-gray-700 border border-gray-100 ${i === arr.length - 1 ? 'rounded-bl-lg' : ''}`}>{service}</td>
                      <td className="px-3 py-2 text-gray-600 border border-gray-100">{purpose}</td>
                      <td className={`px-3 py-2 border border-gray-100 ${i === arr.length - 1 ? 'rounded-br-lg' : ''}`}>
                        <ELink href={link}>{label}</ELink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section number={12} title="Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. We will post the updated policy on
              this page with a new "Last updated" date. Continued use of the app after changes
              constitutes acceptance of the updated policy.
            </P>
          </Section>

          <Section number={13} title="Contact Us">
            <P>
              For any privacy-related questions, requests, data deletion requests, or concerns:
            </P>
            <P><strong>Email:</strong> <MailLink email="contact@slovakforforeigners.eu" /></P>
            <P>We review all correspondence and will respond as soon as reasonably possible.</P>
          </Section>

        </div>
      </div>
    </div>
  );
}
