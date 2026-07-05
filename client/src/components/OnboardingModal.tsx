import { useState, useMemo, useEffect } from 'react';
import { saveOnboarding } from '../lib/supabase/progressSync';
import { type Country } from '../data/countries';
import { fetchCountries } from '../utils/fetchCountries';

interface Props {
  userId: string;
  onDone: () => void;
}

export function OnboardingModal({ userId, onDone }: Props) {
  const [step, setStep]               = useState<'country' | 'gender'>('country');
  const [country, setCountry]         = useState<Country | null>(null);
  const [gender, setGender]           = useState('');
  const [search, setSearch]           = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [countries, setCountries]     = useState<Country[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetchCountries().then(data => {
      setCountries(data);
      setLoadingList(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return countries.filter(
      (c) => c.en.toLowerCase().includes(q) || c.sk.toLowerCase().includes(q),
    );
  }, [search, countries]);

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setStep('gender');
  };

  const handleSubmit = async () => {
    if (!country || !gender || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveOnboarding(
        userId,
        country.en, country.sk,
        country.gen, country.loc,
        country.adj_m, country.adj_f, country.adj_n, country.adv,
        gender,
      );
      onDone();
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  // ── Step 1: Country ──────────────────────────────────────────────────────────
  if (step === 'country') {
    return (
      <div className="fixed inset-0 z-[85] bg-[#E8F4DC] flex flex-col">
        <div className="px-5 pt-12 pb-4 text-center flex-none">
          <img src="/snail.png" alt="" className="w-16 h-16 mx-auto mb-3 object-contain" />
          <h2 className="text-xl font-extrabold text-gray-800">Where are you from?</h2>
          <p className="text-xs text-gray-500 mt-1 leading-snug">
            Helps us build lessons that make sense for your background
          </p>
        </div>

        <div className="px-4 pb-3 flex-none">
          <input
            type="text"
            placeholder="Search country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm outline-none focus:border-brand-green transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {loadingList ? (
            <div className="flex justify-center pt-10">
              <div className="w-7 h-7 rounded-full border-4 border-brand-green border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center pt-6">No results for "{search}"</p>
          ) : (
            filtered.map((c) =>
              c.disabled ? (
                <div
                  key={c.en}
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <span className="block text-sm font-semibold text-gray-400">{c.en}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{c.sk}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium shrink-0 ml-2">Host country</span>
                </div>
              ) : (
                <button
                  key={c.en}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-100 bg-white hover:border-brand-green hover:bg-green-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span className="block text-sm font-semibold text-gray-800">{c.en}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{c.sk}</span>
                </button>
              )
            )
          )}
        </div>
      </div>
    );
  }

  // ── Step 2: Gender ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[85] bg-[#E8F4DC] flex flex-col items-center justify-center px-6">
      <img src="/snail.png" alt="" className="w-16 h-16 mb-4 object-contain" />
      <h2 className="text-xl font-extrabold text-gray-800 mb-1 text-center">What's your gender?</h2>
      <p className="text-xs text-gray-500 mb-2 text-center leading-snug">
        Used to personalise lesson dialogue and examples
      </p>

      <button
        type="button"
        onClick={() => setStep('country')}
        className="mb-6 flex items-center gap-1.5 text-xs text-brand-green font-semibold cursor-pointer hover:underline"
      >
        ← {country?.en}
      </button>

      <div className="w-full max-w-sm space-y-3">
        {(['Male', 'Female'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`w-full py-4 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer active:scale-[0.98] ${
              gender === g
                ? 'border-brand-green bg-green-50 text-brand-green'
                : 'border-gray-200 bg-white text-gray-700 hover:border-brand-green hover:bg-green-50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-red-500 font-semibold text-center">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!gender || saving}
        className={`mt-8 w-full max-w-sm py-3.5 rounded-xl font-extrabold text-sm transition-all ${
          gender && !saving
            ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {saving ? 'Saving…' : 'Continue'}
      </button>
    </div>
  );
}
