/**
 * meta.ts — VERSION DEBUG
 * Affiche des informations de diagnostic dans le synopsis
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

function extractTmdbIdRobust(link: string): { tmdbId: string | null; method: string } {
  if (!link) return { tmdbId: null, method: "lien vide" };

  // Méthode 1 : /watch/{id}
  let m = link.match(/\/watch\/(\d+)/);
  if (m) return { tmdbId: m[1], method: "/watch/{id}" };

  // Méthode 2 : /title/{id}
  m = link.match(/\/title\/(\d+)/);
  if (m) return { tmdbId: m[1], method: "/title/{id}" };

  // Méthode 3 : /movie/{id} ou /tv/{id}
  m = link.match(/\/(?:movie|tv)\/(\d+)/);
  if (m) return { tmdbId: m[1], method: "/movie|tv/{id}" };

  // Méthode 4 : n'importe quelle séquence de 4+ chiffres
  m = link.match(/(\d{4,})/);
  if (m) return { tmdbId: m[1], method: "chiffres seuls" };

  return { tmdbId: null, method: "aucune méthode n'a fonctionné" };
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const debugLines: string[] = [];
  debugLines.push("🔍 DEBUG META.TS");
  debugLines.push(`Lien reçu: "${link}"`);

  const { tmdbId, method } = extractTmdbIdRobust(link);
  debugLines.push(`ID extrait: ${tmdbId ?? "ÉCHEC"} (via: ${method})`);

  try {
    const { axios, commonHeaders } = providerContext;

    if (!tmdbId) {
      return {
        title: "DEBUG — Échec extraction ID",
        synopsis: debugLines.join("\n"),
        type: "movie",
        linkList: [],
        link: link,
      };
    }

    const embedUrl = `${BASE_URL}/api/embed-tmdb/${tmdbId}`;
    debugLines.push(`URL appelée: ${embedUrl}`);

    const response = await axios.get<EmbedResponse>(embedUrl, {
      headers: { ...commonHeaders, Accept: "application/json" },
      timeout: 15000,
    });

    const data = response.data;
    debugLines.push(`API ok: ${data.ok}`);
    debugLines.push(`Titre API: ${data.title}`);
    debugLines.push(`noSource: ${data.noSource ?? "false"}`);
    debugLines.push(`Streams: ${data.streams?.length ?? 0}`);
    debugLines.push(`MP4: ${data.mp4 ? "présent" : "absent"}`);

    if (data.noSource) {
      debugLines.unshift("⚠️ PAS DISPO — API confirme noSource=true");
    } else if (data.streams && data.streams.length > 0) {
      debugLines.unshift(`✅ DISPONIBLE — ${data.streams.map(s => s.resolution + "p").join(" / ")}`);
    } else if (data.mp4) {
      debugLines.unshift("✅ DISPONIBLE — MP4 direct");
    }

    return {
      title: data.title || `DEBUG — tmdb ${tmdbId}`,
      synopsis: debugLines.join("\n"),
      image: data.poster,
      imdbId: data.imdb,
      type: data.type,
      linkList: [],
      link: link,
      extra: { debug: debugLines },
    };
  } catch (error) {
    debugLines.push(`ERREUR: ${error instanceof Error ? error.message : String(error)}`);
    return {
      title: "DEBUG — Erreur",
      synopsis: debugLines.join("\n"),
      type: "movie",
      linkList: [],
      link: link,
    };
  }
};