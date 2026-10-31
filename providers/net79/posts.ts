/**
 * posts.ts
 * 
 * Récupère les listes de films/séries depuis l'API net79.cc.
 * 
 * Endpoints utilisés :
 * - filter="trending" → GET /api/catalog/trending?page=
 * - filter="movie"    → GET /api/catalog/discover?type=movie&page=
 * - filter="tv"       → GET /api/catalog/discover?type=tv&page=
 * - search            → GET /api/catalog/search-hybrid?q=&page=
 * 
 * Conforme au template officiel VEGA App :
 * - getPosts({ filter, page, providerValue, signal, providerContext }) → Promise<Post[]>
 * - getSearchPosts({ searchQuery, page, providerValue, signal, providerContext }) → Promise<Post[]>
 */

import { Post, ProviderContext } from "../types";

// Base URL de l'API net79.cc
const BASE_URL = "https://net79.cc";

// Types locaux pour les réponses API
interface Net79Item {
  tmdbId: number;
  type: string;
  title: string;
  year: string;
  poster: string;
  backdrop?: string;
  rating: number;
  overview: string;
  popularity?: number;
  streamable?: boolean;
  subjectId?: string;
  detailPath?: string;
}

interface Net79ListResponse {
  ok: boolean;
  page: number;
  totalPages: number;
  totalResults?: number;
  items: Net79Item[];
}

/**
 * Détermine l'URL API selon le filtre reçu
 */
function buildApiUrl(filter: string, page: number): string {
  const pageParam = `page=${page}`;

  switch (filter) {
    case "trending":
      return `${BASE_URL}/api/catalog/trending?${pageParam}`;
    case "movie":
      return `${BASE_URL}/api/catalog/discover?type=movie&${pageParam}`;
    case "tv":
      return `${BASE_URL}/api/catalog/discover?type=tv&${pageParam}`;
    default:
      // Fallback sur trending si filtre inconnu
      return `${BASE_URL}/api/catalog/trending?${pageParam}`;
  }
}

/**
 * Transforme un item API net79.cc en objet Post compatible VEGA
 */
function mapToPost(item: Net79Item): Post {
  // Lien encodé : contient tmdbId + type pour meta.ts et stream.ts
  const link = `${BASE_URL}/watch/${item.tmdbId}?type=${item.type}`;

  // Description courte : année + note + extrait overview
  const yearTag = item.year ? `(${item.year})` : "";
  const ratingTag = item.rating ? `★ ${item.rating.toFixed(1)}` : "";
  const header = [yearTag, ratingTag].filter(Boolean).join(" • ");
  const overviewShort =
    item.overview && item.overview.length > 180
      ? item.overview.substring(0, 180) + "…"
      : item.overview || "";
  const description = header ? `${header}\n${overviewShort}` : overviewShort;

  return {
    id: `net79_${item.tmdbId}_${item.type}`,
    name: item.title,
    posterUrl: item.poster,
    image: item.poster,
    description: description || null,
    link: link,
    type: item.type,
    extra: {
      tmdbId: item.tmdbId,
      itemType: item.type,
      year: item.year,
      rating: item.rating,
      backdrop: item.backdrop ?? null,
      popularity: item.popularity ?? null,
      streamable: item.streamable ?? null,
      subjectId: item.subjectId ?? null,
      detailPath: item.detailPath ?? null,
      overview: item.overview,
    },
  };
}

/**
 * Récupère la liste des éléments pour une catégorie donnée
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

    const url = buildApiUrl(filter, page);

    const response = await axios.get<Net79ListResponse>(url, {
      headers: {
        ...commonHeaders,
        Accept: "application/json",
      },
      timeout: 15000,
      signal,
    });

    if (!response.data?.ok || !Array.isArray(response.data.items)) {
      return [];
    }

    return response.data.items.map(mapToPost);
  } catch (error) {
    console.error("[net79][posts.ts] getPosts error:", error);
    return [];
  }
};

/**
 * Recherche des films/séries par mot-clé
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
    params.set("q", searchQuery.trim());
    params.set("page", String(page));

    const url = `${BASE_URL}/api/catalog/search-hybrid?${params.toString()}`;

    const response = await axios.get<Net79ListResponse>(url, {
      headers: {
        ...commonHeaders,
        Accept: "application/json",
      },
      timeout: 15000,
      signal,
    });

    if (!response.data?.ok || !Array.isArray(response.data.items)) {
      return [];
    }

    return response.data.items.map(mapToPost);
  } catch (error) {
    console.error("[net79][posts.ts] getSearchPosts error:", error);
    return [];
  }
};
