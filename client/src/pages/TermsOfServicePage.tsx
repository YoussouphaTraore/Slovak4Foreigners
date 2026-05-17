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
        <p className="text-xs text-gray-400 mt-0.5">Slovak for Foreigners · Last updated: May 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full px-4 py-6 pb-36">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-6 space-y-7">

          <Section number={1} title="Introduction">
            <P>
              Welcome to Slovak for Foreigners (also referred to as "Slovak4Foreigners", "S4F",
              "the app", "we", "us", "our"). By accessing or using this app you agree to be bound by
              these Terms of Service ("Terms"). Please read them carefully.
            </P>
            <P>If you do not agree to these Terms, please do not use the app.</P>
            <Ul>
              <li><strong>Website:</strong> <ELink href="https://www.slovakforforeigners.eu">www.slovakforforeigners.eu</ELink></li>
              <li><strong>Contact:</strong> <MailLink email="contact@slovakforforeigners.eu" /></li>
            </Ul>
          </Section>

          <Section number={2} title="What the App Does">
            <P>Slovak for Foreigners is a language learning web application that:</P>
            <Ul>
              <li>Teaches the Slovak language through interactive lessons and exercises</li>
              <li>Provides practical guides for foreigners living in Slovakia (Foreigner Exclusive section)</li>
              <li>Offers conversational practice through dialogue scenarios</li>
              <li>Organises events such as language meetups and workshops for its community</li>
            </Ul>
            <P>
              The app is designed for foreigners living in or moving to Slovakia who wish to learn
              Slovak for everyday practical use.
            </P>
          </Section>

          <Section number={3} title="Age Requirements">
            <P>
              This app is intended for users who meet the minimum age required by applicable EU and
              Slovak law to consent to data processing and use digital services.
            </P>
            <P>
              Under EU law (GDPR) and Slovak law, this means you must be at least{' '}
              <strong>16 years of age</strong> to create an account and use this app.
            </P>
            <P>
              By using this app you confirm that you meet this age requirement. If you are under the
              required age, you must not use this app. If we become aware that a user is under the
              minimum age, we will delete their account and all associated data without notice.
            </P>
            <P>
              Parents or guardians who believe their child has registered must contact us immediately
              at <MailLink email="contact@slovakforforeigners.eu" />.
            </P>
          </Section>

          <Section number={4} title="Accounts and Registration">
            <SubHeading>Creating an account</SubHeading>
            <P>
              You may use the app as a guest without an account. To save your progress across devices
              you must sign in using Google OAuth.
            </P>
            <P>By creating an account you confirm that:</P>
            <Ul>
              <li>You meet the minimum age requirement set out in Section 3</li>
              <li>The information you provide is accurate</li>
              <li>You will keep your account credentials secure</li>
              <li>You are responsible for all activity under your account</li>
            </Ul>

            <SubHeading>Event registration</SubHeading>
            <P>
              We may from time to time organise events for our community. Where an event requires
              registration, you will be asked to complete a registration form. By submitting a
              registration form you confirm that the information you provide is accurate and that you
              meet any requirements specified for that event.
            </P>

            <SubHeading>Account termination</SubHeading>
            <P>We reserve the right to suspend or terminate accounts that:</P>
            <Ul>
              <li>Violate these Terms</li>
              <li>Attempt to abuse, hack or disrupt the service</li>
              <li>Are used for any unlawful purpose</li>
            </Ul>
          </Section>

          <Section number={5} title="Use of the App">
            <SubHeading>Permitted use</SubHeading>
            <P>You may use this app for personal, non-commercial language learning purposes.</P>

            <SubHeading>Prohibited use</SubHeading>
            <P>You must NOT:</P>
            <Ul>
              <li>Scrape, copy or reproduce lesson content for commercial use</li>
              <li>Attempt to reverse-engineer the app</li>
              <li>Share your account credentials with others</li>
              <li>Use automated tools to complete lessons or earn XP</li>
              <li>Attempt to circumvent the content or subscription system</li>
              <li>Use the app in any way that could damage, disable or impair the service</li>
            </Ul>
          </Section>

          <Section number={6} title="Content and Educational Material">
            <Warning>
              <strong>Important disclaimer — applies to the entire app</strong>
              <br /><br />
              All content in this app — including but not limited to Slovak language lessons, exercise
              content, dialogue scripts, Foreigner Exclusive guides, and any future features or content —
              is provided for <strong>educational and informational purposes only</strong>.
            </Warning>
            <P>
              We make no representations or warranties about the accuracy, completeness or suitability
              of any content in the app. Specifically:
            </P>
            <Ul>
              <li>Slovak language content is created for educational purposes. Any misunderstanding, misinterpretation or incorrect application of language learned through this app is the sole responsibility of the user.</li>
              <li>Cultural, social or practical information about Slovakia may not reflect every regional variation or individual circumstance.</li>
              <li>Content may contain errors and is updated periodically but not in real time.</li>
            </Ul>
            <P><strong>This disclaimer applies to all current and future features and content of the app.</strong></P>

            <SubHeading>Foreigner Exclusive content — Additional disclaimer</SubHeading>
            <P>
              The <strong>Foreigner Exclusive</strong> section contains practical guides about living
              in Slovakia, including information about residence permits, Foreign Police procedures,
              and official documents.
            </P>
            <Warning>
              <strong>This content does NOT constitute legal advice under any circumstances.</strong>
              <br /><br />
              Specifically:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Immigration laws and requirements in Slovakia change regularly</li>
                <li>Document requirements, fees, and procedures may have changed since our content was last updated</li>
                <li>Your individual situation may differ from the general cases described</li>
                <li>We are not immigration lawyers and cannot advise on your specific case</li>
              </ul>
            </Warning>
            <P><strong>We strongly recommend:</strong></P>
            <Ul>
              <li>Verifying all information with the official Slovak Foreign Police (<ELink href="https://www.minv.sk">minv.sk</ELink>)</li>
              <li>Consulting a qualified Slovak immigration lawyer for your specific situation</li>
              <li>Using the IOM Migration Information Centre (<ELink href="https://www.mic.iom.sk">mic.iom.sk</ELink>) for free legal advice</li>
            </Ul>
            <P>
              We accept NO liability for any decisions made based on any content in this app, including
              but not limited to rejected applications, missed deadlines, language misunderstandings, or
              any other consequences arising from use of the app.
            </P>
          </Section>

          <Section number={7} title="Intellectual Property">
            <SubHeading>Our content</SubHeading>
            <P>
              All lesson content, exercise formats, dialogue scripts, app design, and branding —
              including the names Slovak for Foreigners, Slovak4Foreigners, and S4F — are owned by
              Slovak for Foreigners. You may not reproduce, distribute or create derivative works from
              our content without written permission.
            </P>

            <SubHeading>Your content</SubHeading>
            <P>
              You retain ownership of any content you submit (such as feedback or bug reports). By
              submitting feedback you grant us a non-exclusive licence to use it to improve the app.
            </P>
          </Section>

          <Section number={8} title="Premium Features and Payments">
            <SubHeading>Current status</SubHeading>
            <P>
              As of the date of these Terms, the core language learning features of the app are
              available free of charge.
            </P>

            <SubHeading>Future premium features</SubHeading>
            <P>We reserve the right to introduce paid subscription features in the future. If we do:</P>
            <Ul>
              <li>Some features that are currently free may become part of a paid subscription tier</li>
              <li>New premium content and features will be introduced over time</li>
              <li>Any payments will be subject to a separate payment and subscription agreement presented at the time of purchase</li>
              <li>We will make reasonable efforts to communicate changes to the feature access model through the app and by email where possible</li>
            </Ul>
          </Section>

          <Section number={9} title="Availability and Changes">
            <SubHeading>Service availability</SubHeading>
            <P>
              We aim to keep the app available at all times but cannot guarantee 100% uptime. The app
              may be temporarily unavailable due to maintenance, updates, or circumstances beyond our
              control.
            </P>

            <SubHeading>Changes to the app</SubHeading>
            <P>We reserve the right to:</P>
            <Ul>
              <li>Add, modify or remove features at any time</li>
              <li>Change the content of lessons</li>
              <li>Update or correct information in the Foreigner Exclusive section</li>
              <li>Move features between free and premium tiers</li>
              <li>Discontinue the service</li>
            </Ul>
          </Section>

          <Section number={10} title="Limitation of Liability">
            <P>To the fullest extent permitted by applicable law:</P>
            <Ul>
              <li>We provide the app "as is" without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental or consequential damages</li>
              <li>Our total liability to you for any claim shall not exceed €100</li>
            </Ul>
            <Warning>
              <strong>This limitation of liability applies to the entire app — all current and future
              features and content — including but not limited to:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Incorrect, outdated or misunderstood Slovak language content</li>
                <li>Any language misunderstanding or misinterpretation arising from lessons, dialogues or exercises</li>
                <li>Incorrect or outdated information in the Foreigner Exclusive section</li>
                <li>Any immigration application that is rejected, delayed or affected</li>
                <li>Any official Slovak process or procedure that does not go as described</li>
                <li>Loss of progress data due to technical issues</li>
                <li>Any interruption, suspension or termination of the service</li>
                <li>Any decision made by the user based on any content in the app</li>
              </ul>
            </Warning>
          </Section>

          <Section number={11} title="Privacy">
            <P>
              Your use of the app is also governed by our <strong>Privacy Policy</strong>, which is
              incorporated into these Terms by reference. Please read our Privacy Policy at:{' '}
              <a href="/#/privacy" className="text-brand-green underline">
                slovakforforeigners.eu/#/privacy
              </a>
            </P>
          </Section>

          <Section number={12} title="Governing Law">
            <P>
              These Terms are governed by the laws of the <strong>Slovak Republic</strong>. Any disputes
              arising from these Terms shall be subject to the jurisdiction of the courts of the Slovak
              Republic.
            </P>
          </Section>

          <Section number={13} title="Contact">
            <P>For any questions, concerns or legal correspondence regarding these Terms:</P>
            <P><strong>Email:</strong> <MailLink email="contact@slovakforforeigners.eu" /></P>
            <P>We review all correspondence and will respond as soon as reasonably possible.</P>
          </Section>

          <Section number={14} title="Changes to These Terms">
            <P>
              We may update these Terms from time to time. We will post the updated Terms on this page
              with a new "Last updated" date. Continued use of the app after changes constitutes
              acceptance of the updated Terms.
            </P>
          </Section>

          <Section number={15} title="Severability">
            <P>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining
              provisions will continue in full force and effect.
            </P>
          </Section>

        </div>
      </div>
    </div>
  );
}
