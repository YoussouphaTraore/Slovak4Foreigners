import { supabase } from './client';

// GDPR Art. 15/20 — "download my data". Calls the SECURITY DEFINER RPC
// `export_user_data()`, which gathers every row tied to the caller's auth.uid()
// across all user tables (RLS-proof, single round-trip) and returns it as JSON.
export async function exportUserData(): Promise<unknown> {
  const { data, error } = await supabase.rpc('export_user_data');
  if (error) throw error;
  return data;
}

// Serialises the export and triggers a browser download.
export function downloadUserData(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `slovak-for-foreigners-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
