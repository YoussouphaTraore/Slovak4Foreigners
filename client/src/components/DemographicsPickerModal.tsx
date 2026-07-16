import { useState, useMemo, useEffect } from 'react';
import { type Country } from '../data/countries';
import { fetchCountries } from '../utils/fetchCountries';

// A dismissible gender + country picker used to personalise the self-introduction
// exercises "in the moment". Unlike onboarding, this does NOT touch the anonymous
// counter — it only sets the device-local choice. Nothing is written to our DB.
interface Props {
  initialCountry?: Country | null;
  initialGender?: string;
  onSave: (country: Country, gender: string) => void;
  onClose: () => void;
}

export function DemographicsPickerModal({ initialCountry = null, initialGender = '', onSave, onClose }: Props) {
  const [country, setCountry] = useState<Country | null>(initialCountry);
  const [gender, setGender]   = useState(initialGender);
  const [search, setSearch]   = useState('');
  const [countries, setCountries]     = useState<Country[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetchCountries().then((data) => { setCountries(data); setLoadingList(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return countries.filter((c) => c.en.toLowerCase().includes(q) || c.sk.toLowerCase().includes(q));
  }, [search, countries]);

  const canSave = Boolean(country) && Boolean(gender);

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center px-3 pb-3 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex-none px-5 pt-5 pb-3 text-center relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-600 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
          <h2 className="text-lg font-extrabold text-gray-800">Tell us about you</h2>
          <p className="text-[11px] text-gray-600 mt-1 leading-snug px-2">
            Just personalises this exercise on your device — never saved to your account.
          </p>
        </div>

        {/* Gender toggle */}
        <div className="flex-none px-4 pb-3">
          <div className="flex gap-2">
            {(['Male', 'Female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer active:scale-[0.98] ${
                  gender === g
                    ? 'border-brand-green bg-green-50 text-brand-green'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-brand-green hover:bg-green-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Country search */}
        <div className="flex-none px-4 pb-2">
          <input
            type="text"
            aria-label="Search for your country"
            placeholder={country ? `${country.en} — tap to change` : 'Search country…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm outline-none focus:border-brand-green transition-colors"
          />
        </div>

        {/* Country list */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1.5 min-h-[120px]">
          {loadingList ? (
            <div className="flex justify-center pt-8">
              <div className="w-6 h-6 rounded-full border-4 border-brand-green border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-600 text-center pt-6">No results for "{search}"</p>
          ) : (
            filtered.filter((c) => !c.disabled).map((c) => (
              <button
                key={c.en}
                type="button"
                onClick={() => setCountry(c)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer active:scale-[0.98] ${
                  country?.en === c.en
                    ? 'border-brand-green bg-green-50'
                    : 'border-gray-100 bg-white hover:border-brand-green hover:bg-green-50'
                }`}
              >
                <span className="block text-sm font-semibold text-gray-800">{c.en}</span>
                <span lang="sk" className="block text-xs text-gray-600 mt-0.5">{c.sk}</span>
              </button>
            ))
          )}
        </div>

        {/* Save */}
        <div className="flex-none px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => { if (canSave && country) onSave(country, gender); }}
            disabled={!canSave}
            className={`w-full py-3 rounded-xl font-extrabold text-sm transition-all ${
              canSave
                ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
                : 'bg-gray-200 text-gray-600 cursor-not-allowed'
            }`}
          >
            Use this
          </button>
        </div>
      </div>
    </div>
  );
}
