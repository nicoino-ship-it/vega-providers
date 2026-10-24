/**
 * stream.ts
 * 
 * Résout l'URL de lecture en flux vidéo jouable par le lecteur VEGA.
 * 
 * Conforme au template officiel VEGA App :
 * getStream({ link, type, signal, providerContext, isDownload }) → Promise<Stream[]>
 * 
 * Champs retournés : server, link, type, quality
 * 
 * Méthode principale : Endpoint /resolve officiel (protocole mHub v2)
 * L'addon serveur gère TOUT le mécanisme d'authentification :
 * handshake interne, génération du token dynamique, signature de l'URL.
 * 
 * Méthode de secours : Handshake manuel via vavoo.tv/api/box/ping2
 * Activé automatiquement si la méthode principale échoue.
 */

import { Stream, ProviderContext } from "../../types";

const BASE_URL = "https://vavoo.to";
const RESOLVE_ENDPOINT = `${BASE_URL}/live/resolve`;

// Endpoint hérité pour le mécanisme de secours
const VAVOO_TV_PING2 = "https://www.vavoo.tv/api/box/ping2";

// Liste de valeurs vec (identifiants matériel) pour le handshake de secours
const FALLBACK_VEC_LIST: string[] = [
  "001A7952984C", "001A7952984D", "001A7952984E", "001A7952984F",
  "001A79529850", "001A79529851", "001A79529852", "001A79529853",
  "001A79529854", "001A79529855", "001A79529856", "001A79529857",
  "B827EB123456", "B827EB123457", "B827EB123458", "DC:A6:32:12:34:56",
  "00:1E:EC:12:34:56", "00:1E:EC:12:34:57",
];

// En-têtes HTTP requis pour la lecture du flux HLS
const STREAM_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (compatible; VEGA-Player/1.0)",
  Origin: "https://vavoo.to",
  Referer: "https://vavoo.to/",
};

// Cache en mémoire pour la signature de secours (valide ~1h)
let cachedSignature: string | null = null;
let signatureExpiry = 0;

// Type local pour la réponse de résolution
interface VavooResolveResponse {
  url: string;
  live?: boolean;
  format?: string;
  name?: string;
}

/**
 * MÉTHODE PRINCIPALE : Résolution via l'endpoint officiel /resolve
 */
async function resolveViaMhubEndpoint(
  providerContext: ProviderContext,
  playUrl: string,
  signal?: AbortSignal
): Promise<VavooResolveResponse> {
  const { axios, commonHeaders } = providerContext;

  const resolveUrl = `${RESOLVE_ENDPOINT}?url=${encodeURIComponent(playUrl)}`;

  const response = await axios.get<VavooResolveResponse>(resolveUrl, {
    headers: {
      ...commonHeaders,
      Accept: "application/json",
    },
    timeout: 20000,
    signal,
  });

  if (!response.data?.url) {
    throw new Error("Réponse resolve invalide : URL manquante");
  }

  return response.data;
}

/**
 * MÉTHODE DE SECOURS : Obtention d'une signature via handshake vavoo.tv
 */
async function getAuthSignature(
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<string> {
  const { axios } = providerContext;
  const now = Date.now();

  if (cachedSignature && signatureExpiry > now) {
    return cachedSignature;
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const vec =
        FALLBACK_VEC_LIST[Math.floor(Math.random() * FALLBACK_VEC_LIST.length)];

      const body = new URLSearchParams();
      body.set("vec", vec);

      const response = await axios.post(VAVOO_TV_PING2, body.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (compatible; VavooBox/2.0)",
        },
        timeout: 10000,
        signal,
      });

      const data = response.data as any;
      const sig =
        data?.signed ||
        data?.data?.signed ||
        data?.response?.signed;

      if (sig && typeof sig === "string") {
        cachedSignature = sig;
        signatureExpiry = now + 58 * 60 * 1000; // 58 minutes
        return sig;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Impossible d'obtenir une signature après 10 tentatives");
}

/**
 * Extrait l'ID de la chaîne depuis l'URL de lecture
 */
function extractChannelId(playUrl: string): string | null {
  const match = playUrl.match(/\/play\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * MÉTHODE DE SECOURS : Construction de l'URL de flux via signature manuelle
 */
async function resolveViaHandshakeFallback(
  providerContext: ProviderContext,
  playUrl: string,
  signal?: AbortSignal
): Promise<string> {
  const channelId = extractChannelId(playUrl);
  if (!channelId) {
    throw new Error("Impossible d'extraire l'ID de la chaîne");
  }

  const signature = await getAuthSignature(providerContext, signal);
  return `https://vavoo.tv/live/${channelId}/index.m3u8?signed=${encodeURIComponent(signature)}`;
}

/**
 * FONCTION PRINCIPALE : Résout l'URL de lecture en flux HLS jouable
 * 
 * @param link - URL de lecture de la chaîne
 * @param type - Type de contenu demandé par l'application
 * @param signal - AbortSignal pour annuler la requête
 * @param providerContext - Contexte VEGA injecté
 * @param isDownload - Si true, prioriser les serveurs adaptés au téléchargement
 * @returns Tableau Stream[] compatible lecteur VEGA
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
    if (!link) {
      throw new Error("URL de lecture manquante");
    }

    // --- ÉTAPE 1 : Méthode principale via /resolve (recommandée) ---
    let streamUrl: string;
    let streamName: string | undefined;

    try {
      const resolved = await resolveViaMhubEndpoint(providerContext, link, signal);
      streamUrl = resolved.url;
      streamName = resolved.name;
    } catch (resolveError) {
      console.warn(
        "[stream.ts] Endpoint /resolve échoué, tentative fallback :",
        resolveError
      );
      // --- ÉTAPE 2 : Méthode de secours via handshake manuel ---
      streamUrl = await resolveViaHandshakeFallback(providerContext, link, signal);
    }

    // --- ÉTAPE 3 : Construction du tableau Stream[] conforme au template ---
    const streams: Stream[] = [
      {
        server: streamName ?? "Direct HLS",
        link: streamUrl,
        type: "m3u8",
        quality: "HD",
        headers: { ...STREAM_HEADERS },
      },
    ];

    return streams;
  } catch (error) {
    console.error("[stream.ts] ERREUR getStream :", error);
    throw new Error(
      `Résolution du flux impossible : ${error instanceof Error ? error.message : "Erreur inconnue"}`
    );
  }
};
