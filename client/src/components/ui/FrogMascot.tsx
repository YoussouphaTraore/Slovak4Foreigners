interface Props {
  size?: number;
}

export function FrogMascot({ size = 120 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* ── Shadow ── */}
      <ellipse cx="100" cy="197" rx="52" ry="6" fill="rgba(0,0,0,0.10)" />

      {/* ── Decorative leaves ── */}
      <ellipse cx="30" cy="188" rx="24" ry="9" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1.5"
        transform="rotate(-38 30 188)" />
      <ellipse cx="170" cy="188" rx="24" ry="9" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1.5"
        transform="rotate(38 170 188)" />
      <ellipse cx="14" cy="186" rx="16" ry="6" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1"
        transform="rotate(-55 14 186)" />
      <ellipse cx="186" cy="186" rx="16" ry="6" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1"
        transform="rotate(55 186 186)" />

      {/* ── Back legs ── */}
      <ellipse cx="48" cy="182" rx="33" ry="13" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2.5"
        transform="rotate(-18 48 182)" />
      <ellipse cx="152" cy="182" rx="33" ry="13" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2.5"
        transform="rotate(18 152 182)" />
      {/* Back leg spots */}
      <circle cx="37"  cy="175" r="4" fill="#3E8C28" opacity="0.7" />
      <circle cx="52"  cy="185" r="3" fill="#3E8C28" opacity="0.7" />
      <circle cx="163" cy="175" r="4" fill="#3E8C28" opacity="0.7" />
      <circle cx="148" cy="185" r="3" fill="#3E8C28" opacity="0.7" />

      {/* ── Body ── */}
      <ellipse cx="100" cy="170" rx="56" ry="34" fill="#5DBB3A" stroke="#1B4620" strokeWidth="3" />

      {/* ── Belly ── */}
      <ellipse cx="100" cy="167" rx="37" ry="27" fill="#F5F0DC" stroke="#1B4620" strokeWidth="2" />

      {/* ── Front arms ── */}
      <ellipse cx="60" cy="183" rx="24" ry="11" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2.5"
        transform="rotate(-14 60 183)" />
      <ellipse cx="140" cy="183" rx="24" ry="11" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2.5"
        transform="rotate(14 140 183)" />
      {/* Toe blobs – left */}
      <circle cx="43"  cy="190" r="5.5" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2" />
      <circle cx="53"  cy="194" r="5.5" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2" />
      <circle cx="63"  cy="195" r="5.5" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2" />
      {/* Toe blobs – right */}
      <circle cx="137" cy="195" r="5.5" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2" />
      <circle cx="147" cy="194" r="5.5" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2" />
      <circle cx="157" cy="190" r="5.5" fill="#5DBB3A" stroke="#1B4620" strokeWidth="2" />

      {/* ── Head ── */}
      <circle cx="100" cy="103" r="80" fill="#5DBB3A" stroke="#1B4620" strokeWidth="3.5" />

      {/* ── Eye bump mounds (same green, pop above head) ── */}
      <circle cx="66"  cy="58" r="37" fill="#5DBB3A" stroke="#1B4620" strokeWidth="3" />
      <circle cx="134" cy="58" r="37" fill="#5DBB3A" stroke="#1B4620" strokeWidth="3" />

      {/* ── Dark eye fill ── */}
      <circle cx="66"  cy="58" r="30" fill="#173D0C" />
      <circle cx="134" cy="58" r="30" fill="#173D0C" />

      {/* ── Eye highlights – large upper crescent ── */}
      <ellipse cx="80"  cy="46" rx="14" ry="11" fill="white" />
      <ellipse cx="148" cy="46" rx="14" ry="11" fill="white" />
      {/* ── Eye highlights – small lower dot ── */}
      <circle cx="57"  cy="68" r="5.5" fill="white" opacity="0.60" />
      <circle cx="125" cy="68" r="5.5" fill="white" opacity="0.60" />

      {/* ── Centre bump between eye mounds ── */}
      <circle cx="100" cy="64" r="8.5" fill="#3E8C28" stroke="#1B4620" strokeWidth="1.5" />

      {/* ── Forehead freckles ── */}
      <circle cx="87"  cy="83" r="4.5" fill="#3E8C28" />
      <circle cx="100" cy="88" r="4"   fill="#3E8C28" />
      <circle cx="113" cy="83" r="4.5" fill="#3E8C28" />
      <circle cx="79"  cy="92" r="3"   fill="#3E8C28" opacity="0.75" />
      <circle cx="121" cy="92" r="3"   fill="#3E8C28" opacity="0.75" />

      {/* ── Nostrils ── */}
      <circle cx="93"  cy="116" r="3.5" fill="#173D0C" />
      <circle cx="107" cy="116" r="3.5" fill="#173D0C" />

      {/* ── Smile ── */}
      <path
        d="M 80 130 Q 100 150 120 130"
        stroke="#1B4620" strokeWidth="3.5" fill="none" strokeLinecap="round"
      />

      {/* ── Rosy cheeks ── */}
      <circle cx="50"  cy="120" r="19" fill="#FF8FAB" opacity="0.80" />
      <circle cx="150" cy="120" r="19" fill="#FF8FAB" opacity="0.80" />
      {/* Cheek sparkle dots */}
      <circle cx="43"  cy="113" r="5.5" fill="white" opacity="0.65" />
      <circle cx="143" cy="113" r="5.5" fill="white" opacity="0.65" />

      {/* ── Ambient green dots (reference style) ── */}
      <circle cx="170" cy="88" r="4.5" fill="#58CC02" opacity="0.45" />
      <circle cx="180" cy="104" r="3" fill="#58CC02" opacity="0.35" />
      <circle cx="20"  cy="88" r="4.5" fill="#58CC02" opacity="0.45" />
      <circle cx="12"  cy="106" r="3" fill="#58CC02" opacity="0.35" />
    </svg>
  );
}
