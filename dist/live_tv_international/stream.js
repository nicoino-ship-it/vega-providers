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

const BASE_URL = "https://vavoo.to";
const RESOLVE_ENDPOINT = `${BASE_URL}/live/resolve`;
const VAVOO_TV_PING2 = "https://www.vavoo.tv/api/box/ping2";

const FALLBACK_VEC_LIST = [
  "001A7952984C", "001A7952984D", "001A7952984E", "001A7952984F",
  "001A79529850", "001A79529851", "001A79529852", "001A79529853",
  "001A79529854", "001A79529855", "001A79529856", "001A79529857",
  "B827EB123456", "B827EB123457", "B827EB123458", "DC:A6:32:12:34:56",
  "00:1E:EC:12:34:56", "00:1E:EC:12:34:57",
];

const STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; VEGA-Player/1.0)",
  Origin: "https://vavoo.to",
  Referer: "https://vavoo.to/",
};

let cachedSignature = null;
let signatureExpiry = 0;

async function resolveViaMhubEndpoint(providerContext, playUrl, signal) {
  const { axios, commonHeaders } = providerContext;
  const resolveUrl = `${RESOLVE_ENDPOINT}?url=${encodeURIComponent(playUrl)}`;

  const response = await axios.get(resolveUrl, {
    headers: { ...commonHeaders, Accept: "application/json" },
    timeout: 20000,
    signal,
  });

  if (!response.data?.url) {
    throw new Error("Réponse resolve invalide : URL manquante");
  }

  return response.data;
}

async function getAuthSignature(providerContext, signal) {
  const { axios } = providerContext;
  const now = Date.now();

  if (cachedSignature && signatureExpiry > now) {
    return cachedSignature;
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const vec = FALLBACK_VEC_LIST[Math.floor(Math.random() * FALLBACK_VEC_LIST.length)];
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

      const data = response.data;
      const sig = data?.signed || data?.data?.signed || data?.response?.signed;

      if (sig && typeof sig === "string") {
        cachedSignature = sig;
        signatureExpiry = now + 58 * 60 * 1000;
        return sig;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Impossible d'obtenir une signature après 10 tentatives");
}

function extractChannelId(playUrl) {
  const match = playUrl.match(/\/play\/(\d+)/);
  return match ? match[1] : null;
}

async function resolveViaHandshakeFallback(providerContext, playUrl, signal) {
  const channelId = extractChannelId(playUrl);
  if (!channelId) {
    throw new Error("Impossible d'extraire l'ID de la chaîne");
  }

  const signature = await getAuthSignature(providerContext, signal);
  return `https://vavoo.tv/live/${channelId}/index.m3u8?signed=${encodeURIComponent(signature)}`;
}

module.exports = {
  getStream: async function ({
    link,
    type,
    signal,
    providerContext,
    isDownload,
  }) {
    try {
      if (!link) {
        throw new Error("URL de lecture manquante");
      }

      let streamUrl;
      let streamName;

      try {
        const resolved = await resolveViaMhubEndpoint(providerContext, link, signal);
        streamUrl = resolved.url;
        streamName = resolved.name;
      } catch (resolveError) {
        console.warn("[stream.js] Endpoint /resolve échoué, tentative fallback :", resolveError);
        streamUrl = await resolveViaHandshakeFallback(providerContext, link, signal);
      }

      const streams = [
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
      console.error("[stream.js] ERREUR getStream :", error);
      throw new Error(
        `Résolution du flux impossible : ${error instanceof Error ? error.message : "Erreur inconnue"}`
      );
    }
  }
};
