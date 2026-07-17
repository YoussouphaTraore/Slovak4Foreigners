import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Only reflect CORS for known app origins (local dev, Vercel deploys, the
// phone-testing tunnel). The real protection is the JWT check below — CORS
// alone never stops non-browser callers.
const ALLOWED_ORIGIN =
  /^(https?:\/\/localhost(:\d+)?|https:\/\/([a-z0-9-]+\.)?slovakforforeigners\.eu|https:\/\/[a-z0-9-]+\.vercel\.app|https:\/\/[a-z0-9-]+\.trycloudflare\.com)$/;

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB — a spoken clip is a few dozen KB

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGIN.test(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// OpenAI selects the decoder from the file extension, so it has to match the
// real container rather than being hardcoded. Chrome, Firefox and Safari 18.4+
// (Mar 2025) all record WebM/Opus; older Safari (14.1–18.3) falls back to
// MP4/AAC, which a fixed ".webm" would misdeclare.
//
// Naming that MP4 honestly is necessary but NOT sufficient: Safari's AAC is
// reported to transcribe poorly or partially even when correctly labelled, so
// old-Safari voice input is not considered supported. Making that work would
// need a transcode (e.g. ffmpeg → mp3) here, not a rename.
//
// Resolved from the MIME type against an allowlist, then from the client's
// extension — never by interpolating the client's filename, which is untrusted
// input bound for a multipart header.
const MIME_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/mp4': 'mp4',
  'video/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mpga': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

// Formats the transcription endpoint accepts.
const ALLOWED_EXT = new Set(['webm', 'mp4', 'm4a', 'mp3', 'mpeg', 'mpga', 'ogg', 'wav', 'flac']);

function audioExtension(file: File): string {
  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  const fromMime = MIME_EXT[mime];
  if (fromMime) return fromMime;

  const fromName = (file.name || '').split('.').pop()?.toLowerCase() ?? '';
  if (ALLOWED_EXT.has(fromName)) return fromName;

  return 'webm';
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  // Require a real, logged-in Supabase user. The anon key is itself a valid JWT,
  // so platform verify_jwt is not enough — we must resolve an actual user.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401, cors);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, cors);

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'Service unavailable' }, 503, cors);

    const formData = await req.formData();
    const audioFile = formData.get('audio');
    if (!audioFile || !(audioFile instanceof File)) {
      return json({ error: 'No audio file provided' }, 400, cors);
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return json({ error: 'Audio too large' }, 413, cors);
    }

    const openAiForm = new FormData();
    openAiForm.append('file', audioFile, `recording.${audioExtension(audioFile)}`);
    openAiForm.append('model', 'gpt-4o-mini-transcribe');
    openAiForm.append('language', 'sk');
    openAiForm.append('prompt', 'Slovenčina. Toto je cvičenie slovenského jazyka.');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: openAiForm,
    });

    if (!response.ok) {
      // Log server-side; never leak upstream error bodies to the client
      console.error('OpenAI transcription error', response.status, await response.text());
      return json({ error: 'Transcription failed' }, 502, cors);
    }

    const result = await response.json();
    return json({ transcript: result.text ?? '' }, 200, cors);
  } catch (e) {
    console.error('transcribe-speech internal error', e);
    return json({ error: 'Internal error' }, 500, cors);
  }
});
