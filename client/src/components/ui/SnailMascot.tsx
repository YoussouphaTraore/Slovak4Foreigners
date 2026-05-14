interface Props {
  size?: number;
}

export function SnailMascot({ size = 120 }: Props) {
  const h = Math.round((size * 150) / 160);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 160 150"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* ── Drop shadow ── */}
      <ellipse cx="72" cy="143" rx="56" ry="7" fill="rgba(0,0,0,0.12)" />

      {/* ── Body / foot ── */}
      <ellipse cx="72" cy="131" rx="54" ry="15" fill="#FDE68A" stroke="#3B2400" strokeWidth="3" />
      {/* Belly shine */}
      <ellipse cx="55" cy="122" rx="22" ry="5" fill="white" opacity="0.25" />

      {/* ── Shell ── */}
      {/* Outer ring */}
      <circle cx="106" cy="84" r="46" fill="#92400E" stroke="#3B2400" strokeWidth="3.5" />
      {/* Ring 2 */}
      <circle cx="106" cy="84" r="33" fill="#B45309" stroke="#3B2400" strokeWidth="2.5" />
      {/* Ring 3 */}
      <circle cx="106" cy="84" r="21" fill="#D97706" stroke="#3B2400" strokeWidth="2" />
      {/* Ring 4 */}
      <circle cx="106" cy="84" r="11" fill="#F59E0B" stroke="#3B2400" strokeWidth="1.5" />
      {/* Centre dot */}
      <circle cx="106" cy="84" r="4.5" fill="#FCD34D" />
      {/* Shell gloss */}
      <ellipse
        cx="91" cy="63"
        rx="13" ry="8"
        fill="white" opacity="0.30"
        transform="rotate(-28 91 63)"
      />

      {/* ── Head ── */}
      <circle cx="42" cy="95" r="31" fill="#FEF3C7" stroke="#3B2400" strokeWidth="3.5" />
      {/* Head top-shine */}
      <ellipse cx="35" cy="76" rx="11" ry="6" fill="white" opacity="0.20" transform="rotate(-20 35 76)" />

      {/* ── Eye stalks ── */}
      <path
        d="M 30 71 C 24 54 19 39 16 24"
        stroke="#3B2400" strokeWidth="4.5" fill="none" strokeLinecap="round"
      />
      <path
        d="M 53 68 C 58 51 62 36 66 21"
        stroke="#3B2400" strokeWidth="4.5" fill="none" strokeLinecap="round"
      />

      {/* ── Left eye ── */}
      <circle cx="15" cy="22" r="14" fill="white" stroke="#3B2400" strokeWidth="3" />
      <circle cx="15" cy="23" r="7.5" fill="#1C1917" />
      {/* Pupil shine */}
      <circle cx="18" cy="19" r="3" fill="white" />
      <circle cx="12" cy="26" r="1.5" fill="white" opacity="0.6" />
      {/* Left eyebrow — raised & arched (happy) */}
      <path
        d="M 4 10 Q 14 4 25 9"
        stroke="#3B2400" strokeWidth="4" fill="none" strokeLinecap="round"
      />

      {/* ── Right eye ── */}
      <circle cx="67" cy="20" r="14" fill="white" stroke="#3B2400" strokeWidth="3" />
      <circle cx="67" cy="21" r="7.5" fill="#1C1917" />
      {/* Pupil shine */}
      <circle cx="70" cy="17" r="3" fill="white" />
      <circle cx="64" cy="24" r="1.5" fill="white" opacity="0.6" />
      {/* Right eyebrow */}
      <path
        d="M 56 8 Q 67 2 78 7"
        stroke="#3B2400" strokeWidth="4" fill="none" strokeLinecap="round"
      />

      {/* ── Open smile (mouth cavity + top lip arc) ── */}
      {/* Mouth cavity */}
      <path
        d="M 27 104 Q 42 120 58 104"
        fill="#C2383A" stroke="#3B2400" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Tongue */}
      <ellipse cx="42" cy="114" rx="8" ry="5" fill="#F87171" />
      {/* Mouth top edge re-drawn over fill */}
      <path
        d="M 27 104 Q 42 120 58 104"
        fill="none" stroke="#3B2400" strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* ── Blush cheeks ── */}
      <ellipse cx="21" cy="106" rx="8.5" ry="5.5" fill="#FCA5A5" opacity="0.70" />
      <ellipse cx="62" cy="104" rx="8.5" ry="5.5" fill="#FCA5A5" opacity="0.70" />

      {/* ── Tiny antenna tips (snail-ness!) ── */}
      <circle cx="15" cy="22" r="14" fill="none" stroke="#3B2400" strokeWidth="3" />
      <circle cx="67" cy="20" r="14" fill="none" stroke="#3B2400" strokeWidth="3" />
    </svg>
  );
}
