/** Replace " / " separators with " or " so TTS doesn't read "slash". */
export function cleanForSpeech(text: string): string {
  return text.replace(/\s*\/\s*/g, ', or, ');
}
