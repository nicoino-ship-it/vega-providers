/**
 * stream.ts — VERSION CORRIGÉE DÉFINITIVE
 */

import { Stream, ProviderContext } from "../types";

const BASE_URL = "https://net79.cc";

const STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://net79.cc/",
  Origin: "https://net79.cc",
};

function extractTmdbId(link: string): string | null {
  if (!link) return null;
  const m = link.match(/\/watch\/(\d+)/) || link.match(/net79_(\d+)_/) || link.match(/(\d+)/);
  return m ? m[1] : null;
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const tmdbId = extractTmdbId(link);
  if (!tmdbId) throw new Error("[Net79] ID introuvable");

  const { axios } = providerContext;
  const response = await axios.get(`${BASE_URL}/api/embed-tmdb/${tmdbId}`, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://net79.cc/" },
    timeout: 20000,
    signal,
  });

  const data = response.data;
  if (!data?.ok) throw new Error("[Net79] API invalide");
  if (data.noSource) throw new Error(`⚠️ ${data.error || "Ce titre n'est pas encore disponible."}`);

  const streams: Stream[] = [];

  if (data.streams?.length) {
    const sorted = isDownload 
      ? [...data.streams].sort((a, b) => b.resolution - a.resolution)
      : [...data.streams].sort((a, b) => (a.resolution === 720 ? -1 : b.resolution === 720 ? 1 : 0));
    
    for (const s of sorted) {
      streams.push({ server: `Net79 ${s.resolution}p`, link: s.url, type: "mp4", quality: String(s.resolution), headers: { ...STREAM_HEADERS } });
    }
  }

  if (data.mp4 && !streams.some(s => s.link === data.mp4)) {
    streams.push({ server: `Net79 ${data.resolution || "Default"}`, link: data.mp4, type: "mp4", quality: data.resolution || "720", headers: { ...STREAM_HEADERS } });
  }

  if (data.fallbackHls) {
    const fUrl = data.fallbackHls.startsWith("http") ? data.fallbackHls : `${BASE_URL}${data.fallbackHls}`;
    streams.push({ server: "Net79 HLS", link: fUrl, type: "m3u8", quality: "Auto", headers: { ...STREAM_HEADERS } });
  }

  if (!streams.length) throw new Error("[Net79] Aucune source trouvée.");
  return streams;
};