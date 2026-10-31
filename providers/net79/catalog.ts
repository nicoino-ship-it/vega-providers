/**
 * catalog.ts
 * 
 * Définit les catégories affichées sur la page d'accueil de VEGA.
 * 
 * - title : Libellé affiché dans l'interface
 * - filter : Valeur transmise à getPosts() pour déterminer l'endpoint API
 * 
 * Valeurs de filter utilisées :
 *   "trending" → /api/catalog/trending
 *   "movie"    → /api/catalog/discover?type=movie
 *   "tv"       → /api/catalog/discover?type=tv
 */

export const catalog = [
  { title: "🔥 Tendances", filter: "trending" },
  { title: "🎬 Films", filter: "movie" },
  { title: "📺 Séries TV", filter: "tv" },
];
