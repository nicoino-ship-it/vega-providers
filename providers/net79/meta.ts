/**
 * meta.ts
 * 
 * Récupère les métadonnées détaillées d'un film ou d'une série.
 * 
 * Point clé : retourne linkList avec directLinks pour que VEGA
 * affiche un bouton "Lire" au lieu d'un menu déroulant vide.
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
  currentSeason?: number;
  currentEpisode?: number;
  streams?: Array<{ url: string; resolution: number; size: number }>;
  mp4?: string;
  resolution?: string;
  noSource?: boolean;
  error?: string;
}

function extractTmdbId(link: string): string | null {
  if (!link) return null;
  const m = link.match(/\/watch\/(\d+)/) || link.match(/(\d{4,})/);
  return m ? m[1] : null;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, commonHeaders } = providerContext;

    const tmdbId = extractTmdbId(link);
    if (!tmdbId) throw new Error("ID introuvable");

    const response = await axios.get<EmbedResponse>(
      `${BASE_URL}/api/embed-tmdb/${tmdbId}`,
      {
        headers: { ...commonHeaders, Accept: "application/json" },
        timeout: 15000,
      }
    );

    const data = response.data;
    if (!data?.ok) throw new Error("API invalide");

    // Construction du synopsis
    const synopsisParts: string[] = [];
    const typeTag = data.type === "movie" ? "🎬 Film" : data.type === "tv" ? "📺 Série" : `📁 ${data.type}`;
    const yearTag = data.year ? `📅 ${data.year}` : "";
    synopsisParts.push([typeTag, yearTag].filter(Boolean).join(" • "));

    if (data.imdb) synopsisParts.push(`🎬 IMDB : ${data.imdb}`);

    // Disponibilité
    if (data.noSource) {
      synopsisParts.unshift("⚠️ PAS ENCORE DISPONIBLE");
      synopsisParts.push("💡 Ce titre est trop récent ou n'a pas encore été ajouté.");
    } else {
      const resos = data.streams?.map((s) => `${s.resolution}p`).join(" / ") || data.resolution || "";
      synopsisParts.unshift(resos ? `✅ DISPONIBLE — ${resos}` : "✅ DISPONIBLE");
    }

    // ⭐ SOLUTION : linkList avec directLinks
    // Comme ça VEGA affiche "Lire" et appelle getStream avec le bon lien
    const linkList = [
      {
        title: data.type === "tv" ? "Saison 1" : "Lecture",
        directLinks: [
          {
            link: link,
            title: data.type === "tv" ? "Épisode 1" : "Lire le film",
            type: data.type === "tv" ? "series" : "movie",
          },
        ],
        quality: data.resolution || "720",
      },
    ];

    return {
      title: data.title,
      synopsis: synopsisParts.join("\n"),
      image: data.poster,
      imdbId: data.imdb,
      type: data.type,
      linkList: linkList,
      link: link,
      extra: {
        tmdbId: data.tmdbId,
        noSource: data.noSource ?? false,
        hasStreams: !!(data.streams && data.streams.length > 0),
      },
    };
  } catch (error) {
    console.error("[net79][meta.ts] error:", error);

    // Même en cas d'erreur, retourner un linkList pour que VEGA affiche quelque chose
    return {
      title: "Contenu",
      synopsis: "Métadonnées temporairement indisponibles.",
      type: "movie",
      linkList: [
        {
          title: "Lecture",
          directLinks: [{ link: link, title: "Lire", type: "movie" }],
        },
      ],
      link: link,
    };
  }
};