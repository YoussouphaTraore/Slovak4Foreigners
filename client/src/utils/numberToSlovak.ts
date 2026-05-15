const ones     = ['', 'jeden', 'dva', 'tri', 'štyri', 'päť', 'šesť', 'sedem', 'osem', 'deväť'];
const teens    = ['desať', 'jedenásť', 'dvanásť', 'trinásť', 'štrnásť', 'pätnásť',
                  'šestnásť', 'sedemnásť', 'osemnásť', 'devätnásť'];
const tensW    = ['', '', 'dvadsať', 'tridsať', 'štyridsiať', 'päťdesiat',
                  'šesťdesiat', 'sedemdesiat', 'osemdesiat', 'deväťdesiat'];
const hundredsW = ['', 'sto', 'dvesto', 'tristo', 'štyri sto', 'päťsto',
                   'šesťsto', 'sedemsto', 'osemsto', 'deväťsto'];

/** Convert a non-negative integer (0–9999) to its Slovak word form. */
export function numberToSlovak(n: number): string {
  if (n === 0) return 'nula';

  let result = '';

  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    result += k === 1 ? 'tisíc' : (k === 2 ? 'dve' : ones[k]) + 'tisíc';
    n %= 1000;
  }

  if (n >= 100) {
    result += hundredsW[Math.floor(n / 100)];
    n %= 100;
  }

  if (n >= 20) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    result += tensW[t] + (o > 0 ? ones[o] : '');
  } else if (n >= 10) {
    result += teens[n - 10];
  } else if (n > 0) {
    result += ones[n];
  }

  return result;
}

/** If s is a plain integer string return it in Slovak words, otherwise return s unchanged. */
export function toSlovakLabel(s: string): string {
  return /^\d+$/.test(s) ? numberToSlovak(parseInt(s, 10)) : s;
}

/**
 * Replace every standalone 1–4 digit integer in a Slovak text string with its
 * Slovak word form. Numbers with 5+ digits (phone numbers, postal codes, etc.)
 * are left untouched.
 */
export function slovakifyNumbers(text: string): string {
  return text.replace(/(?<!\d)([1-9]\d{0,3})(?!\d)/g, (_, n) => numberToSlovak(parseInt(n, 10)));
}
