/**
 * meta.ts
 * 
 * Récupère les métadonnées détaillées d'un élément sélectionné.
 * 
 * Conforme au template officiel VEGA App :
 * getMeta({ link, providerContext }) → Promise<Info>
 * 
 * Champs retournés : title, synopsis, image, type, linkList
 */

const BASE_URL = "https://vavoo.to";

function extractChannelId(link) {
  if (!link) return null;
  const match = link.match(/\/play\/(\d+)/);
  return match ? match[1] : null;
}

function formatEpgSynopsis(epg, channelName) {
  if (!epg || epg.length === 0) {
    return channelName ?? "Chaîne TV en direct";
  }

  const now = Date.now();
  let currentProgram = null;
  const upcoming = [];

  for (const program of epg) {
    try {
      const start = new Date(program.start);
      const end = new Date(program.end);
      const startTime = start.getTime();
      const endTime = end.getTime();

      const hours = start.getHours().toString().padStart(2, "0");
      const minutes = start.getMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}h${minutes}`;

      if (now >= startTime && now < endTime) {
        currentProgram = { title: program.title, timeStr };
      } else if (startTime > now && upcoming.length < 3) {
        upcoming.push({ title: program.title, timeStr });
      }
    } catch {
      continue;
    }
  }

  let synopsis = channelName ? `${channelName}\n\n` : "";

  if (currentProgram) {
    synopsis += `EN CE MOMENT :\n${currentProgram.title}\n\n`;
  }

  if (upcoming.length > 0) {
    synopsis += `À VENIR :\n`;
    for (const prog of upcoming) {
      synopsis += `${prog.timeStr} — ${prog.title}\n`;
    }
  }

  return synopsis.trim();
}

module.exports = {
  getMeta: async function ({ link, providerContext }) {
    try {
      const { axios, commonHeaders } = providerContext;

      const channelId = extractChannelId(link);
      if (!channelId) {
        throw new Error(`Impossible d'extraire l'ID de la chaîne depuis : ${link}`);
      }

      let itemData = null;
      try {
        const itemUrl = `${BASE_URL}/live/item/live/${channelId}.json`;
        const response = await axios.get(itemUrl, {
          headers: { ...commonHeaders, Accept: "application/json" },
          timeout: 10000,
        });
        itemData = response.data;
      } catch (apiError) {
        console.warn("[meta.js] API item indisponible, fallback sur données minimales");
        itemData = null;
      }

      const name = itemData?.name ?? "Chaîne TV";
      const country = itemData?.tags?.[0];
      const epg = itemData?.epg ?? [];

      let imageUrl;
      if (itemData?.images?.logo) {
        imageUrl = itemData.images.logo.startsWith("http")
          ? itemData.images.logo
          : `${BASE_URL}${itemData.images.logo}`;
      } else {
        imageUrl = `${BASE_URL}/live2/logo/${channelId}.png`;
      }

      let currentEpg = null;
      const now = Date.now();
      for (const prog of epg) {
        try {
          const s = new Date(prog.start).getTime();
          const e = new Date(prog.end).getTime();
          if (now >= s && now < e) {
            currentEpg = prog.title;
            break;
          }
        } catch {
          continue;
        }
      }

      return {
        title: name,
        synopsis: formatEpgSynopsis(epg, name),
        image: imageUrl,
        type: "live",
        linkList: [],
        link: link,
        extra: {
          channelId,
          country,
          tvgId: itemData?.ids?.tvg ?? null,
          epgFull: epg,
          currentProgram: currentEpg,
        },
      };
    } catch (error) {
      console.error("[meta.js] getMeta error:", error);
      return {
        title: "Chaîne TV",
        synopsis: "Chaîne en direct",
        type: "live",
        linkList: [],
        link: link,
        extra: {},
      };
    }
  }
};
