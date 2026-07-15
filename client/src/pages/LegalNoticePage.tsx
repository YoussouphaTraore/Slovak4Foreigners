import { useNavigate } from 'react-router-dom';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-xs font-semibold text-gray-500 sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 leading-relaxed break-words">{children}</span>
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

export function LegalNoticePage() {
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
        <h1 className="text-lg font-extrabold text-gray-800">Legal Notice</h1>
        <p className="text-xs text-gray-400 mt-0.5">Prevádzkovateľ · Slovak for Foreigners</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full px-4 py-6 pb-36">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-6 space-y-6">

          {/* Operator identification (§4 zákona č. 22/2004 Z. z. o elektronickom obchode) */}
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-1">Operator / Prevádzkovateľ</h2>
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              This website and application are operated by the following sole trader
              (živnostník) registered in the Slovak Republic.
            </p>
            <div>
              <Field label="Business name / Obchodné meno">Mgr. Youssoupha Traore</Field>
              <Field label="Business address / Miesto podnikania">
                Martinčekova 780/12, 821 09 Bratislava – Ružinov, Slovak Republic
              </Field>
              <Field label="IČO">55111432</Field>
              <Field label="DIČ">1129003788</Field>
              <Field label="IČ DPH">SK1129003788</Field>
              <Field label="Trade register / Živnostenský register">
                Zapísaný v Živnostenskom registri Okresného úradu Bratislava, č. 110-327314
              </Field>
              <Field label="Registered since / Deň vzniku">24. 04. 2023</Field>
              <Field label="Email">
                <MailLink email="contact@slovakforforeigners.eu" />
              </Field>
              <Field label="Website">
                <ELink href="https://www.slovakforforeigners.eu">www.slovakforforeigners.eu</ELink>
              </Field>
            </div>
          </section>

          {/* Supervisory authority for consumer matters */}
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-1">Supervisory Authority / Dozorný orgán</h2>
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              For consumer-protection matters, the competent supervisory authority is the
              Slovak Trade Inspection (Slovenská obchodná inšpekcia).
            </p>
            <div>
              <Field label="Authority">
                Slovenská obchodná inšpekcia (SOI)
              </Field>
              <Field label="Inšpektorát">
                Inšpektorát SOI so sídlom v Bratislave pre Bratislavský kraj, Bajkalská 21/A, 827 99 Bratislava 27
              </Field>
            </div>
          </section>

          {/* Legal-docs cross-links */}
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">Legal Documents</h2>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/privacy')}
                className="text-sm text-brand-green underline text-left cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => navigate('/terms')}
                className="text-sm text-brand-green underline text-left cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
