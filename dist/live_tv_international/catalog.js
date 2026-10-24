/**
 * catalog.ts
 * 
 * Définit les catégories affichées sur la page d'accueil de VEGA.
 * 
 * - title : Libellé affiché dans l'interface
 * - filter : Valeur transmise à getPosts() pour récupérer les éléments
 * 
 * Conforme au template officiel VEGA App :
 * export const catalog = [{ title, filter }, ...]
 */

export const catalog = [
  { title: "Live TV - France", filter: "France" },
  { title: "Live TV - France Sport", filter: "France Sport" },
  { title: "Live TV - Allemagne", filter: "Germany" },
  { title: "Live TV - Royaume-Uni", filter: "United Kingdom" },
  { title: "Live TV - Italie", filter: "Italy" },
  { title: "Live TV - Espagne", filter: "Spain" },
  { title: "Live TV - Portugal", filter: "Portugal" },
  { title: "Live TV - Pays-Bas", filter: "Netherlands" },
  { title: "Live TV - Turquie", filter: "Turkey" },
  { title: "Live TV - Arabie", filter: "Arabia" },
];
