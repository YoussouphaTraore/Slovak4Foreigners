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

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 leading-relaxed">
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 leading-relaxed">
      {children}
    </div>
  );
}

function MailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="text-brand-green underline break-all">{email}</a>
  );
}

function ELink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-green underline break-all">
      {children}
    </a>
  );
}

export function TermsOfServicePage() {
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
        <h1 className="text-lg font-extrabold text-gray-800">Terms of Service</h1>
        <p className="text-xs text-gray-600 mt-0.5">Slovak for Foreigners · Last updated: 15 July 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full px-4 py-6 pb-36">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-6 space-y-7">

          <P>
            These Terms of Service ("Terms") govern your use of the Slovak for Foreigners app. The app is
            provided <strong>free of charge</strong>. Nothing in these Terms limits your mandatory rights as
            a consumer under Slovak law — see section 11.
          </P>

          <Section number={1} title="Introduction">
            <P>
              Welcome to Slovak for Foreigners (also "Slovak4Foreigners", "S4F", "the app", "we", "us",
              "our"). By accessing or using the app you agree to these Terms. If you do not agree, please
              do not use the app.
            </P>
            <P>The app is operated by the sole trader identified in our{' '}
              <button type="button" onClick={() => navigate('/legal')} className="text-brand-green underline cursor-pointer">Legal Notice</button>.
            </P>
            <Ul>
              <li><strong>Website:</strong> <ELink href="https://www.slovakforforeigners.eu">www.slovakforforeigners.eu</ELink></li>
              <li><strong>Contact:</strong> <MailLink email="contact@slovakforforeigners.eu" /></li>
            </Ul>
          </Section>

          <Section number={2} title="What the App Does">
            <P>Slovak for Foreigners is a free language-learning web application that:</P>
            <Ul>
              <li>Teaches Slovak through interactive lessons and exercises (including pronunciation practice using your microphone)</li>
              <li>Provides practical guides for foreigners living in Slovakia (the "Foreigner Exclusive" section)</li>
              <li>Offers conversational practice through dialogue scenarios</li>
              <li>May occasionally offer in-person practice sessions or meetups for its community</li>
            </Ul>
          </Section>

          <Section number={3} title="Age Requirement">
            <P>
              You must be at least <strong>16 years of age</strong> to use the app, in line with EU (GDPR)
              and Slovak law on consent to data processing. By using the app you confirm you meet this
              requirement. If we become aware that a user is under 16, we will delete the account and its
              data. Parents or guardians with concerns may contact{' '}
              <MailLink email="contact@slovakforforeigners.eu" />.
            </P>
          </Section>

          <Section number={4} title="Accounts">
            <SubHeading>Guest use and sign-in</SubHeading>
            <P>
              You may use the app as a guest. To save your progress across devices you can sign in with
              Google. You authenticate directly with Google — we never see your password and receive only
              your email address (see the{' '}
              <button type="button" onClick={() => navigate('/privacy')} className="text-brand-green underline cursor-pointer">Privacy Policy</button>).
              You are identified in the app by a nickname (alias), not your real name.
            </P>
            <P>By using an account you agree to keep access to it secure and to be responsible for activity under it.</P>

            <SubHeading>In-person sessions</SubHeading>
            <P>
              If you indicate interest in an in-person session, we record only that your account expressed
              interest — no separate registration form or personal details are collected for this.
            </P>

            <SubHeading>Suspension or termination</SubHeading>
            <P>We may suspend or terminate access for accounts that materially breach these Terms, attempt to abuse, hack or disrupt the service, or use it unlawfully. You can delete your account at any time from the Profile page.</P>
          </Section>

          <Section number={5} title="Acceptable Use">
            <P>You may use the app for personal, non-commercial language learning. You must not:</P>
            <Ul>
              <li>Scrape, copy or reproduce lesson content for commercial use</li>
              <li>Attempt to reverse-engineer the app</li>
              <li>Share your account access with others</li>
              <li>Use automated tools to complete lessons or earn XP</li>
              <li>Attempt to circumvent access controls or security measures</li>
              <li>Use the app in any way that could damage, disable or impair the service</li>
            </Ul>
          </Section>

          <Section number={6} title="Educational Content &amp; Disclaimers">
            <Warning>
              <strong>All content is for educational and informational purposes only.</strong>
              <br /><br />
              Slovak language lessons, exercises, dialogues, and the Foreigner Exclusive guides are learning
              material. We aim for accuracy but do not guarantee that content is complete, error-free, or
              suitable for any specific purpose beyond general language learning. Content is updated
              periodically, not in real time.
            </Warning>
            <P>
              The app is under continuous development. Content and features may change, be incomplete, or
              contain errors, and should be treated as an evolving learning aid — not a definitive or
              professional reference.
            </P>

            <SubHeading>Foreigner Exclusive — not legal advice</SubHeading>
            <P>
              The <strong>Foreigner Exclusive</strong> section contains general guides about living in
              Slovakia (residence permits, Foreign Police procedures, official documents).
            </P>
            <Warning>
              <strong>This content is general information, not legal advice.</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Immigration laws, fees and procedures change regularly and may have changed since our content was last updated</li>
                <li>Your individual situation may differ from the general cases described</li>
                <li>We are not immigration lawyers and cannot advise on your specific case</li>
              </ul>
            </Warning>
            <P><strong>We strongly recommend</strong> that you verify anything important with official sources before acting:</P>
            <Ul>
              <li>The Slovak Foreign Police / Ministry of Interior (<ELink href="https://www.minv.sk">minv.sk</ELink>)</li>
              <li>A qualified Slovak immigration lawyer for your specific situation</li>
              <li>The IOM Migration Information Centre (<ELink href="https://www.mic.iom.sk">mic.iom.sk</ELink>) for free advice</li>
            </Ul>
            <P>
              To the extent permitted by law, we are not responsible for decisions you make based on the
              content of the app. This does not affect the mandatory liability we cannot exclude, or your
              consumer rights — see sections 10 and 12.
            </P>
          </Section>

          <Section number={7} title="Intellectual Property">
            <SubHeading>Our content</SubHeading>
            <P>
              All lesson content, exercise formats, dialogue scripts, app design and branding — including
              the names Slovak for Foreigners, Slovak4Foreigners and S4F — belong to the operator. You may
              not reproduce, distribute or create derivative works from our content without written
              permission.
            </P>
            <SubHeading>Your content</SubHeading>
            <P>
              You keep ownership of anything you submit (such as feedback or bug reports). By submitting
              feedback you grant us a non-exclusive licence to use it to improve the app.
            </P>
          </Section>

          <Section number={8} title="Price">
            <Note>
              <strong>The app is free to use.</strong> We do not charge for the features described here, and
              you are never automatically enrolled in any paid plan.
            </Note>
            <P>
              If we ever introduce optional paid features, we will show clear terms and pricing
              <strong> before</strong> you pay, ask for your agreement at that point, and never retroactively
              charge you for features you have already used for free.
            </P>
          </Section>

          <Section number={9} title="Availability &amp; Changes">
            <P>
              We aim to keep the app available but cannot guarantee uninterrupted uptime; it may be
              temporarily unavailable for maintenance, updates, or reasons beyond our control. We may add,
              change or remove features and content, and may discontinue the service. Where we discontinue
              the service we will make reasonable efforts to give notice so you can export your data first
              (Profile → Your data → "Download my data").
            </P>
          </Section>

          <Section number={10} title="Liability">
            <P>Because the app is provided free of charge, and to the extent permitted by law:</P>
            <Ul>
              <li>The app and its content are provided on an "as is" and "as available" basis for general language learning</li>
              <li>We are not liable for indirect or consequential loss, or for loss that was not reasonably foreseeable</li>
              <li>We are not liable for loss of progress data caused by technical issues, or for interruption, suspension or discontinuation of the service</li>
            </Ul>
            <Warning>
              <strong>Nothing in these Terms excludes or limits our liability where it would be unlawful to do so.</strong>
              This includes liability for death or personal injury caused by our negligence, for fraud or
              fraudulent misrepresentation, for gross negligence or intentional breach, and any liability that
              cannot be excluded or limited under mandatory Slovak consumer-protection law.
            </Warning>
          </Section>

          <Section number={11} title="Indemnification">
            <P>
              To the extent permitted by law, you agree to compensate us for reasonable loss, damage, or
              costs we actually incur as a direct result of: (a) your breach of these Terms; (b) your misuse
              of the app; or (c) your unlawful use of the app or your infringement of someone else's rights.
            </P>
            <P>
              This does not apply to loss caused by us, and it does not affect or reduce your mandatory
              rights as a consumer (section 12).
            </P>
          </Section>

          <Section number={12} title="Your Consumer Rights">
            <P>
              You use the app as a consumer. <strong>Nothing in these Terms limits or excludes the mandatory
              rights you have under Slovak law</strong> — including the Consumer Protection Act
              (zákon č. 250/2007 Z. z.) and the Civil Code — that cannot be limited or excluded by agreement.
              Where any provision of these Terms conflicts with those mandatory rights, your statutory rights
              prevail.
            </P>
          </Section>

          <Section number={13} title="Complaints &amp; Dispute Resolution">
            <P>
              If you have a complaint, please contact us first at{' '}
              <MailLink email="contact@slovakforforeigners.eu" /> — we will try to resolve it.
            </P>
            <P>
              If we cannot resolve it, you have the right to turn to the competent body for
              <strong> alternative dispute resolution (ADR)</strong> in consumer matters — the Slovak Trade
              Inspection (Slovenská obchodná inšpekcia, SOI), <ELink href="https://www.soi.sk">soi.sk</ELink>.
              The competent supervisory authority is identified in our{' '}
              <button type="button" onClick={() => navigate('/legal')} className="text-brand-green underline cursor-pointer">Legal Notice</button>.
            </P>
          </Section>

          <Section number={14} title="Privacy">
            <P>
              Your use of the app is also governed by our{' '}
              <button
                type="button"
                onClick={() => navigate('/privacy')}
                className="text-brand-green underline cursor-pointer"
              >
                Privacy Policy
              </button>
              , which is incorporated into these Terms by reference.
            </P>
          </Section>

          <Section number={15} title="Governing Law">
            <P>
              These Terms are governed by the law of the <strong>Slovak Republic</strong>, and disputes fall
              under the jurisdiction of the Slovak courts. This does not deprive you, as a consumer, of the
              protection of any mandatory rules of the country where you habitually reside.
            </P>
          </Section>

          <Section number={16} title="Changes to These Terms">
            <P>
              We may update these Terms from time to time. We will post the updated Terms here with a new
              "Last updated" date, and for material changes we will notify users in the app. Continued use
              after changes take effect constitutes acceptance of the updated Terms.
            </P>
          </Section>

          <Section number={17} title="Severability">
            <P>
              If any provision of these Terms is found invalid or unenforceable, the remaining provisions
              continue in full force and effect.
            </P>
          </Section>

          <Section number={18} title="Contact">
            <P>For any questions or legal correspondence regarding these Terms:</P>
            <P><strong>Email:</strong> <MailLink email="contact@slovakforforeigners.eu" /></P>
            <P>We review all correspondence and respond as soon as reasonably possible.</P>
          </Section>

        </div>
      </div>
    </div>
  );
}
