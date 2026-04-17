const AUDIO_DB_KEY = process.env.THEAUDIODB_API_KEY?.trim() || "123";
const AUDIO_DB_BASE = `https://www.theaudiodb.com/api/v1/json/${AUDIO_DB_KEY}`;

export async function audioDbGet(pathWithQuery: string): Promise<unknown> {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const res = await fetch(`${AUDIO_DB_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TheAudioDB HTTP ${res.status}: ${text.slice(0, 180)}`);
  }
  return (await res.json()) as unknown;
}
