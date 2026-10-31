/**
 * stream.ts
 * 
 * Résout les liens de streaming vidéo depuis net79.cc.
 * 
 * Endpoint utilisé : GET /api/embed-tmdb/{tmdbId}
 * 
 * Cet endpoint retourne directement :
 * - Un flux MP4 principal (qualité par défaut)
 * - Un tableau de streams multi-résolutions (360p, 720p, 1080p)
 * - Un fallback HLS optionnel
 * 
 * Les URLs sont signées et temporaires (expiration dans ~8h).
 * 
 * Conforme au template officiel VEGA App :
 * getStream({ link, type, signal, providerContext, isDownload }) → Promise<Stream[]>
 */

import { Stream, ProviderContext } from "../types";

const BASE_URL = "https://net79.cc";

// Type de réponse de l'endpoint embed-tmdb
interface EmbedStream {
  url: string;
  resolution: number;
  size: number;
}

interface EmbedResponse {
  ok: boolean;
  tmdbId: number;
  title: string;
  year: string;
  imdb?: string;
  type: string;
  poster?: string;
  mode?: string;
  mp4?: string;
  resolution?: string;
  streams?: EmbedStream[];
  direct?: boolean;
  cdn?: string;
  source?: string;
  fallbackHls?: string;
  noSource?: boolean;
  error?: string;
}

// En-têtes HTTP requis pour accéder au CDN
const STREAM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://net79.cc/",
  Origin: "https://net79.cc",
};

/**
 * Extrait le tmdbId depuis le lien encodé
 * Format : https://net79.cc/watch/{tmdbId}?type={type}
 */
function extractTmdbId(link: string): string | null {
  if (!link) return null;
  const match = link.match(/\/watch\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Tri des résolutions selon le contexte (streaming vs téléchargement)
 * - Streaming : prioriser 720p (bon compromis qualité/bande passante)
 * - Téléchargement : prioriser 1080p (meilleure qualité)
 */
function sortStreamsByContext(
  streams: EmbedStream[],
  isDownload?: boolean
): EmbedStream[] {
  const copy = [...streams];

  if (isDownload) {
    // Téléchargement : meilleure qualité d'abord
    copy.sort((a, b) => b.resolution - a.resolution);
  } else {
    // Streaming : 720p d'abord, puis 1080p, puis 360p
    copy.sort((a, b) => {
      const priority = (r: number) => (r === 720 ? 0 : r === 1080 ? 1 : 2);
      return priority(a.resolution) - priority(b.resolution);
    });
  }

  return copy;
}

/**
 * Résout les sources de streaming pour un titre donné
 */
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
  try {
    const { axios, commonHeaders } = providerContext;

    const tmdbId = extractTmdbId(link);

    if (!tmdbId) {
      throw new Error(`Impossible d'extraire l'ID depuis : ${link}`);
    }

    // Appel à l'endpoint embed-tmdb pour obtenir les URLs signées
    const embedUrl = `${BASE_URL}/api/embed-tmdb/${tmdbId}`;

    const response = await axios.get<EmbedResponse>(embedUrl, {
      headers: {
        ...commonHeaders,
        Accept: "application/json",
      },
      timeout: 20000,
      signal,
    });

    const data = response.data;

    if (!data?.ok) {
      throw new Error("Réponse API invalide");
    }

    if (data.noSource) {
      throw new Error(
        data.error || "Ce titre n'est pas encore disponible en streaming."
      );
    }

    const streams: Stream[] = [];

    // 1. Ajouter les streams multi-résolutions si disponibles
    if (data.streams && Array.isArray(data.streams) && data.streams.length > 0) {
      const sorted = sortStreamsByContext(data.streams, isDownload);

      for (const s of sorted) {
        streams.push({
          server: `Net79 — ${s.resolution}p`,
          link: s.url,
          type: "mp4",
          quality: String(s.resolution),
          headers: { ...STREAM_HEADERS },
        });
      }
    }

    // 2. Ajouter le flux MP4 principal si disponible et pas déjà listé
    if (data.mp4) {
      const alreadyIncluded = streams.some((s) => s.link === data.mp4);
      if (!alreadyIncluded) {
        streams.push({
          server: `Net79 — ${data.resolution || "default"}`,
          link: data.mp4,
          type: "mp4",
          quality: data.resolution || "720",
          headers: { ...STREAM_HEADERS },
        });
      }
    }

    // 3. Ajouter le fallback HLS si disponible
    if (data.fallbackHls) {
      const fallbackUrl = data.fallbackHls.startsWith("http")
        ? data.fallbackHls
        : `${BASE_URL}${data.fallbackHls}`;

      streams.push({
        server: "Net79 — HLS Fallback",
        link: fallbackUrl,
        type: "m3u8",
        quality: "Auto",
        headers: { ...STREAM_HEADERS },
      });
    }

    if (streams.length === 0) {
      throw new Error("Aucune source de streaming disponible pour ce titre.");
    }

    return streams;
  } catch (error) {
    console.error("[net79][stream.ts] getStream error:", error);
    throw new Error(
      `[Net79] Impossible de résoudre le flux : ${error instanceof Error ? error.message : "Erreur inconnue"}`
    );
  }
};
