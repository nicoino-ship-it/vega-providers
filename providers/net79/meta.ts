/**
 * meta.ts — VERSION DEBUG ULTIME
 * Affiche TOUT dans le synopsis pour diagnostiquer
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
  noSource?: boolean;
  error?: string;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const debug: string[] = [];
  debug.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  debug.push("🔍 DIAGNOSTIC NET79");
  debug.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  debug.push(`1. Lien reçu: "${link}"`);
  debug.push(`   Longueur: ${link.length} caractères`);

  // Essaye TOUS les patterns d'extraction
  const patterns: { name: string; regex: RegExp }[] = [
    { name: "/watch/{id}", regex: /\/watch\/(\d+)/ },
    { name: "/title/{id}", regex: /\/title\/(\d+)/ },
    { name: "/movie/{id}", regex: /\/movie\/(\d+)/ },
    { name: "/tv/{id}", regex: /\/tv\/(\d+)/ },
    { name: "chiffres seuls", regex: /(\d{4,})/ },
  ];

  let tmdbId: string | null = null;
  let methodUsed = "aucun";
  for (const p of patterns) {
    const m = link.match(p.regex);
    if (m) {
      debug.push(`2. Pattern "${p.name}" → ID: ${m[1]}`);
      if (!tmdbId) {
        tmdbId = m[1];
        methodUsed = p.name;
      }
    } else {
      debug.push(`2. Pattern "${p.name}" → ÉCHEC`);
    }
  }

  if (!tmdbId) {
    return {
      title: "❌ DEBUG — AUCUN ID TROUVÉ",
      synopsis: debug.join("\n"),
      type: "movie",
      linkList: [{ title: "Lecture", directLinks: [{ link, title: "Lire", type: "movie" }] }],
      link,
    };
  }

  debug.push(`3. ID utilisé: ${tmdbId} (via: ${methodUsed})`);

  try {
    const { axios } = providerContext;

    debug.push(`4. Appel API: /api/embed-tmdb/${tmdbId}`);

    // Test SANS commonHeaders d'abord
    const response = await axios.get<EmbedResponse>(
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
    debug.push(`5. API répond: ok=${data.ok}`);
    debug.push(`6. Titre API: "${data.title}"`);
    debug.push(`7. noSource: ${data.noSource ?? "false"}`);
    debug.push(`8. Streams: ${data.streams?.length ?? 0}`);
    debug.push(`9. MP4: ${data.mp4 ? "OUI" : "NON"}`);

    if (data.error) debug.push(`10. Erreur API: ${data.error}`);

    // Statut final
    if (data.noSource) {
      debug.unshift("⚠️ API dit: PAS DISPONIBLE");
    } else if (data.streams?.length || data.mp4) {
      debug.unshift("✅ API dit: DISPONIBLE");
    } else {
      debug.unshift("❓ API dit: OK mais pas de flux");
    }

    return {
      title: data.title || `DEBUG — tmdb ${tmdbId}`,
      synopsis: debug.join("\n"),
      image: data.poster,
      imdbId: data.imdb,
      type: data.type,
      linkList: [{
        title: data.type === "tv" ? "Saison 1" : "Lecture",
        directLinks: [{ link, title: data.type === "tv" ? "Épisode 1" : "Lire", type: data.type === "tv" ? "series" : "movie" }],
        quality: data.resolution || "720",
      }],
      link,
    };
  } catch (err) {
    debug.push(`❌ ERREUR: ${err instanceof Error ? err.message : String(err)}`);
    return {
      title: "❌ DEBUG ERREUR",
      synopsis: debug.join("\n"),
      type: "movie",
      linkList: [{ title: "Lecture", directLinks: [{ link, title: "Lire", type: "movie" }] }],
      link,
    };
  }
};