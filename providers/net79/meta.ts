/**
 * meta.ts — VERSION CORRIGÉE DÉFINITIVE
 */

import { Info, ProviderContext } from "../types";

const BASE_URL = "https://net79.cc";

interface EmbedResponse {
  ok: boolean;
  tmdbId: number;
  title: string;
  year: string;
  imdb?: string;
  type: string;
  poster?: string;
  streams?: Array<{ url: string; resolution: number; size: number }>;
  mp4?: string;
  resolution?: string;
  noSource?: boolean;
  error?: string;
}

function extractTmdbId(link: string): string | null {
  if (!link) return null;

  // Pattern 1 : format officiel /watch/{id} — accepte 1+ chiffres
  let m = link.match(/\/watch\/(\d+)/);
  if (m) return m[1];

  // Pattern 2 : format net79_{id}_... (au cas où VEGA transmet l'ID)
  m = link.match(/net79_(\d+)_/);
  if (m) return m[1];

  // Pattern 3 : n'importe quelle séquence de chiffres (1+)
  m = link.match(/(\d+)/);
  if (m) return m[1];

  return null;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios } = providerContext;

    const tmdbId = extractTmdbId(link);
    if (!tmdbId) throw new Error("ID introuvable");

    const response = await axios.get(
      `${BASE_URL}/api/embed-tmdb/${tmdbId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://net79.cc/",
        },
        timeout: 15000,
      }
    );

    const data = response.data;
    if (!data?.ok) throw new Error("API invalide");

    const synopsis: string[] = [];
    const typeTag = data.type === "movie" ? "🎬 Film" : data.type === "tv" ? "📺 Série" : "📁 Contenu";
    const yearTag = data.year ? `📅 ${data.year}` : "";
    synopsis.push([typeTag, yearTag].filter(Boolean).join(" • "));
    if (data.imdb) synopsis.push(`🎬 IMDB : ${data.imdb}`);

    if (data.noSource) {
      synopsis.unshift("⚠️ PAS ENCORE DISPONIBLE");
      synopsis.push("💡 Ce titre est trop récent.");
    } else {
      const resos = data.streams?.map(s => `${s.resolution}p`).join(" / ") || data.resolution || "";
      synopsis.unshift(resos ? `✅ DISPONIBLE — ${resos}` : "✅ DISPONIBLE");
    }

    return {
      title: data.title,
      synopsis: synopsis.join("\n"),
      image: data.poster,
      imdbId: data.imdb,
      type: data.type,
      linkList: [{
        title: data.type === "tv" ? "Saison 1" : "Lecture",
        directLinks: [{
          link: link,
          title: data.type === "tv" ? "Épisode 1" : "Lire le film",
          type: data.type === "tv" ? "series" : "movie",
        }],
        quality: data.resolution || "720",
      }],
      link: link,
      extra: { tmdbId: data.tmdbId, noSource: data.noSource ?? false },
    };
  } catch (error) {
    return {
      title: "Contenu",
      synopsis: "Métadonnées indisponibles.",
      type: "movie",
      linkList: [{ title: "Lecture", directLinks: [{ link, title: "Lire", type: "movie" }] }],
      link,
    };
  }
};