/**
 * meta.ts
 * 
 * Récupère les métadonnées détaillées d'un film ou d'une série.
 * 
 * Endpoint utilisé : GET /api/embed-tmdb/{tmdbId}
 * Cet endpoint retourne : titre, année, IMDB, type, poster,
 * disponibilité du streaming, et résolutions disponibles.
 * 
 * Conforme au template officiel VEGA App :
 * getMeta({ link, providerContext }) → Promise<Info>
 */

import { Info, ProviderContext } from "../types";

const BASE_URL = "https://net79.cc";

// Type de réponse de l'endpoint embed-tmdb
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
  exp?: number;
  sig?: string;
  mode?: string;
  mp4?: string;
  resolution?: string;
  streams?: Array<{ url: string; resolution: number; size: number }>;
  direct?: boolean;
  cdn?: string;
  source?: string;
  subjectId?: string;
  detailPath?: string;
  match?: string;
  fallbackHls?: string;
  noSource?: boolean;
  error?: string;
}

/**
 * Extrait le tmdbId et le type depuis le lien encodé
 * Format attendu : https://net79.cc/watch/{tmdbId}?type={type}
 */
function extractFromLink(link: string): { tmdbId: string | null; itemType: string | null } {
  if (!link) return { tmdbId: null, itemType: null };

  const tmdbMatch = link.match(/\/watch\/(\d+)/);
  const typeMatch = link.match(/type=([^&]+)/);

  return {
    tmdbId: tmdbMatch ? tmdbMatch[1] : null,
    itemType: typeMatch ? typeMatch[1] : null,
  };
}

/**
 * Récupère les métadonnées complètes d'un titre
 */
export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, commonHeaders } = providerContext;

    const { tmdbId, itemType } = extractFromLink(link);

    if (!tmdbId) {
      throw new Error(`Impossible d'extraire l'ID depuis : ${link}`);
    }

    // Appel à l'endpoint embed-tmdb pour les métadonnées + disponibilité
    const embedUrl = `${BASE_URL}/api/embed-tmdb/${tmdbId}`;

    const response = await axios.get<EmbedResponse>(embedUrl, {
      headers: {
        ...commonHeaders,
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const data = response.data;

    if (!data?.ok) {
      throw new Error("Réponse API invalide");
    }

    // Construction du synopsis
    const synopsisParts: string[] = [];

    // Année et type
    const yearTag = data.year ? `📅 Année : ${data.year}` : "";
    const typeTag = data.type === "movie" ? "🎬 Film" : data.type === "tv" ? "📺 Série" : `📁 ${data.type}`;
    synopsisParts.push(`${typeTag}${yearTag ? " • " + yearTag : ""}`);

    // IMDB si disponible
    if (data.imdb) {
      synopsisParts.push(`🎬 IMDB : ${data.imdb}`);
    }

    // Disponibilité du streaming — EN TÊTE D'AFFICHE
    if (data.noSource) {
      synopsisParts.unshift(
        `⚠️ PAS ENCORE DISPONIBLE EN STREAMING`
      );
      synopsisParts.push(
        `\n💡 Ce titre est trop récent ou n'a pas encore été ajouté.`
      );
      synopsisParts.push(`👉 Essaye un film plus ancien (ex: The Dark Knight, Pulp Fiction).`);
    } else {
      const resolutions: string[] = [];
      if (data.streams && Array.isArray(data.streams)) {
        for (const s of data.streams) {
          if (s.resolution) resolutions.push(`${s.resolution}p`);
        }
      } else if (data.resolution) {
        resolutions.push(`${data.resolution}p`);
      }
      if (resolutions.length > 0) {
        synopsisParts.unshift(`✅ DISPONIBLE — ${resolutions.join(" / ")}`);
      } else {
        synopsisParts.unshift(`✅ DISPONIBLE EN STREAMING`);
      }
    }

    // Info série : saison/épisode courant
    if (data.type === "tv" && data.currentSeason) {
      synopsisParts.push(`📺 Saison ${data.currentSeason} • Épisode ${data.currentEpisode || 1}`);
    }

    return {
      title: data.title,
      synopsis: synopsisParts.join("\n"),
      image: data.poster,
      imdbId: data.imdb,
      type: data.type,
      linkList: [],
      link: link,
      extra: {
        tmdbId: data.tmdbId,
        itemType: data.type,
        year: data.year,
        mode: data.mode,
        cdn: data.cdn,
        source: data.source,
        subjectId: data.subjectId,
        detailPath: data.detailPath,
        match: data.match,
        noSource: data.noSource ?? false,
        hasStreams: !!(data.streams && data.streams.length > 0),
        hasMp4: !!data.mp4,
        fallbackHls: data.fallbackHls ?? null,
      },
    };
  } catch (error) {
    console.error("[net79][meta.ts] getMeta error:", error);

    // Fallback minimal
    const { tmdbId } = extractFromLink(link);
    return {
      title: "Contenu",
      synopsis: "Métadonnées temporairement indisponibles.",
      type: "movie",
      linkList: [],
      link: link,
      extra: { tmdbId, error: error instanceof Error ? error.message : String(error) },
    };
  }
};