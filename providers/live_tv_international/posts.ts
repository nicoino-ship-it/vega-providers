/**
 * posts.ts
 * 
 * Récupère la liste des éléments (chaînes TV) pour une catégorie donnée
 * et gère la recherche textuelle.
 * 
 * Conforme au template officiel VEGA App :
 * - getPosts({ filter, page, providerValue, signal, providerContext }) → Promise<Post[]>
 * - getSearchPosts({ searchQuery, page, providerValue, signal, providerContext }) → Promise<Post[]>
 */

import { Post, ProviderContext } from "../../types";

// Base URL de l'API source
const BASE_URL = "https://vavoo.to";
const CATALOG_ENDPOINT = `${BASE_URL}/live/catalog/live/channels.json`;

// Types locaux pour la réponse API (spécifiques à cette source)
interface VavooChannelItem {
  id: string;
  name: string;
  type: string;
  url: string;
  tags?: string[];
  ids?: { tvg?: string };
  images?: { logo?: string; poster?: string };
  epg?: Array<{ title: string; start: string; end: string }>;
}

interface VavooCatalogResponse {
  items: VavooChannelItem[];
  nextCursor?: string | number | null;
}

/**
 * Construit l'URL complète du logo de la chaîne
 */
function buildLogoUrl(channelId: string, images?: { logo?: string }): string {
  if (images?.logo) {
    if (images.logo.startsWith("http")) {
      return images.logo;
    }
    return `${BASE_URL}${images.logo}`;
  }
  return `${BASE_URL}/live2/logo/${channelId}.png`;
}

/**
 * Détermine le programme en cours de diffusion à partir de l'EPG
 */
function getCurrentEpg(
  epg?: Array<{ title: string; start: string; end: string }>
): string | null {
  if (!epg || epg.length === 0) return null;

  const now = Date.now();
  for (const program of epg) {
    try {
      const start = new Date(program.start).getTime();
      const end = new Date(program.end).getTime();
      if (now >= start && now < end) {
        return program.title;
      }
    } catch {
      continue;
    }
  }
  return epg[0]?.title ?? null;
}

/**
 * Transforme un item brut de l'API en objet Post compatible VEGA
 */
function mapToPost(item: VavooChannelItem): Post {
  const currentProgram = getCurrentEpg(item.epg);
  const logoUrl = buildLogoUrl(item.id, item.images);

  return {
    id: `live_${item.id}`,
    name: item.name,
    posterUrl: logoUrl,
    image: logoUrl,
    description: currentProgram ? `En ce moment : ${currentProgram}` : null,
    link: item.url,
    type: "live",
    extra: {
      channelId: item.id,
      country: item.tags?.[0] ?? null,
      tvgId: item.ids?.tvg ?? null,
      epgFull: item.epg ?? [],
      currentProgram,
    },
  };
}

/**
 * Charge la liste des chaînes pour une catégorie/pays donné
 */
export const getPosts = async function ({
  filter,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios, commonHeaders } = providerContext;

    const params = new URLSearchParams();
    params.set("filter[group]", filter);
    params.set("sort", "trending");

    const url = `${CATALOG_ENDPOINT}?${params.toString()}`;

    const response = await axios.get<VavooCatalogResponse>(url, {
      headers: {
        ...commonHeaders,
        Accept: "application/json",
      },
      timeout: 15000,
      signal,
    });

    if (!response.data?.items || !Array.isArray(response.data.items)) {
      return [];
    }

    return response.data.items.map(mapToPost);
  } catch (error) {
    console.error("[posts.ts] getPosts error:", error);
    return [];
  }
};

/**
 * Recherche des chaînes par nom dans tout le catalogue
 */
export const getSearchPosts = async function ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios, commonHeaders } = providerContext;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    params.set("search", searchQuery.trim());

    const url = `${CATALOG_ENDPOINT}?${params.toString()}`;

    const response = await axios.get<VavooCatalogResponse>(url, {
      headers: {
        ...commonHeaders,
        Accept: "application/json",
      },
      timeout: 15000,
      signal,
    });

    if (!response.data?.items || !Array.isArray(response.data.items)) {
      return [];
    }

    return response.data.items.map(mapToPost);
  } catch (error) {
    console.error("[posts.ts] getSearchPosts error:", error);
    return [];
  }
};
