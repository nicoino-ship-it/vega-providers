<div align="center">

# 📺 Module d'intégration de flux TV standard

**Extension pour application multimédia VEGA**

[![Version](https://img.shields.io/badge/Version-1.0.0-00d4ff?style=for-the-badge&logo=semver&logoColor=white)](https://semver.org/)
[![Status](https://img.shields.io/badge/Status-✅%20Ready-22c55e?style=for-the-badge&logo=checkmarx&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Platform](https://img.shields.io/badge/Plateforme-VEGA-f59e0b?style=for-the-badge&logo=android&logoColor=white)](https://8man.in)
[![Build](https://img.shields.io/badge/Build-npm%20run%20build-4D9D3C?style=for-the-badge&logo=npm&logoColor=white)](#)

---

### Intégration standardisée de sources de télévision en continu

</div>

---

## 📑 Table des matières

- [📋 Présentation](#-présentation)
- [📁 Structure du projet](#-structure-du-projet)
- [⚙️ Architecture technique](#-architecture-technique)
- [🔧 Compilation](#-compilation)
- [🚀 Déploiement](#-déploiement)
- [🛡️ Sécurité](#-sécurité)
- [📦 Caractéristiques](#-caractéristiques)

---

## 📋 Présentation

Module d'intégration conforme à l'architecture VEGA App. Ce projet implémente un connecteur standardisé permettant à l'application de découvrir, consulter et lire des sources de télévision en ligne.

**Fonctionnalités :**
- 📺 Catalogue organisé par catégories géographiques
- 🔍 Moteur de recherche textuel
- 📋 Guide des programmes (EPG) intégré
- ▶️ Résolution automatique de flux vidéo HLS
- 🔄 Double mécanisme de résilience pour la lecture

---

## 📁 Structure du projet

> ⚠️ **Règle d'or VEGA App** :
> - `types.ts` se trouve **à la racine** du dépôt
> - Chaque provider vit dans son propre dossier sous `providers/`
> - Le nom du dossier provider correspond **exactement** à la clé `value` du `manifest.json`
> - Le dossier `dist/` est **exclusivement réservé aux fichiers compilés** générés par `npm run build`
> - Après compilation, chaque provider dispose de son propre sous-dossier dans `dist/`

```
vega-providers/
├── manifest.json              ← [ { display_name, value, version, icon, type, disabled } ]
├── README.md                  ← Documentation
├── types.ts                   ← Interfaces partagées (importé via "../../types")
│
├── providers/                 ← 📂 Sources TypeScript
│   └── live_tv_international/ ← Nom = "value" du manifest.json
│       ├── catalog.ts         ← Définition des catégories
│       ├── posts.ts           ← Liste des éléments + recherche
│       ├── meta.ts            ← Métadonnées détaillées
│       ├── stream.ts          ← Résolution des flux vidéo
│       ├── episodes.ts        ← (Optionnel) Gestion des épisodes
│       └── settings.ts        ← (Optionnel) Paramètres du provider
│
└── dist/                      ← 📂 Généré automatiquement par npm run build
    └── live_tv_international/ ← Nom = "value" du manifest.json
        ├── catalog.js         ← Fichier compilé pour la sandbox VEGA
        ├── posts.js           ← Fichier compilé pour la sandbox VEGA
        ├── meta.js            ← Fichier compilé pour la sandbox VEGA
        └── stream.js          ← Fichier compilé pour la sandbox VEGA
```

---

## ⚙️ Architecture technique

### Conformité VEGA App

| Spécification | Implémentation |
|---|---|
| **Langage** | TypeScript strict |
| **Exports** | Exports nommés (`export const`) |
| **Types** | Interfaces importées depuis `../../types` |
| **Requêtes HTTP** | Exclusivement via `providerContext.axios` |
| **Signatures fonctions** | Objet destructuré unique : `({ filter, page, providerContext, ... })` |
| **Format manifeste** | Tableau JSON `[...]` |
| **Compilation** | Compatible `npm run build` |
| **Dossier source** | `providers/live_tv_international/` |
| **Dossier sortie** | `dist/live_tv_international/` |

### Signatures de fonctions officielles

**catalog.ts**
```typescript
export const catalog = [{ title, filter }, ...];
```

**posts.ts**
```typescript
export const getPosts = async function ({
  filter, page, providerValue, signal, providerContext
}): Promise<Post[]>

export const getSearchPosts = async function ({
  searchQuery, page, providerValue, signal, providerContext
}): Promise<Post[]>
```

**meta.ts**
```typescript
export const getMeta = async function ({
  link, providerContext
}): Promise<Info>
```

**stream.ts**
```typescript
export const getStream = async function ({
  link, type, signal, providerContext, isDownload
}): Promise<Stream[]>
```

### Interfaces TypeScript clés (définies dans `types.ts`)

- **`Post`** — Élément de liste : `{ id, name, posterUrl, image, description, link, type, extra }`
- **`Info`** — Métadonnées : `{ title, synopsis, image, type, linkList, link, extra }`
- **`Stream`** — Source vidéo : `{ server, link, type, quality, headers }`
- **`ProviderContext`** — Utilitaires injectés : `{ axios, cheerio, commonHeaders, kvStore }`

---

## 🔧 Compilation

Le projet utilise le pipeline de build officiel de VEGA App. La commande `npm run build` transpile les fichiers TypeScript depuis `providers/live_tv_international/` vers `dist/live_tv_international/`.

```bash
# Installation des dépendances
npm install

# Compilation TypeScript → JavaScript
npm run build
```

**Processus de compilation :**

```
providers/live_tv_international/
    ├── catalog.ts    ──┐
    ├── posts.ts      ──┤  npm run build  ──►  dist/live_tv_international/
    ├── meta.ts       ──┤                  ├── catalog.js
    └── stream.ts     ──┘                  ├── posts.js
                                           ├── meta.js
                                           └── stream.js
```

**Résultat attendu :**
- Les fichiers `.ts` de `providers/live_tv_international/` sont transpilés en `.js`
- La sortie est générée dans `dist/live_tv_international/` (même nom que la clé `value`)
- Les fichiers `.js` générés sont prêts à être consommés par la sandbox VEGA

---

## 🚀 Déploiement

### Configuration requise

- Dépôt Git hébergé (accès via Personal Access Token)
- Structure des fichiers respectée à l'identique
- Fichier `manifest.json` à la racine au format tableau
- Commande `npm run build` exécutée avant déploiement
- Dossier `dist/live_tv_international/` contenant les 4 fichiers `.js` à jour

### Format du manifeste

```json
[
  {
    "display_name": "Nom affiché dans l'application",
    "value": "live_tv_international",
    "version": "1.0.0",
    "icon": "https://...",
    "type": "global",
    "disabled": false
  }
]
```

> 🔑 **Important :** La valeur de la clé `value` doit correspondre **exactement** :
> - Au nom du dossier source : `providers/live_tv_international/`
> - Au nom du dossier de sortie : `dist/live_tv_international/`

---

## 🛡️ Sécurité

### Bonnes pratiques implémentées

| Mesure | Description |
|---|---|
| **Aucun secret en clair** | Tokens et clés générés dynamiquement au runtime |
| **Try/catch systématiques** | Aucune erreur non gérée ne remonte à l'application |
| **Headers HTTP appropriés** | User-Agent, Origin, Referer configurés pour les flux |
| **Cache intelligent** | Signature d'authentification mise en mémoire temporairement |
| **Double mécanisme** | Méthode principale + fallback automatique en cas d'échec |
| **commonHeaders** | Utilisation des en-têtes standard fournis par VEGA |

### Gestion du dépôt

- Dépôt configuré en **accès privé**
- Authentification via **Personal Access Token** (`ghp_...`)
- Aucune information sensible dans la documentation publique
- README générique sans mots-clés spécifiques

---

## 📦 Caractéristiques

### Fiabilité

- ✅ Typage TypeScript strict sur toutes les fonctions
- ✅ Signatures de fonctions conformes au template officiel
- ✅ Valeurs de fallback pour tous les champs optionnels
- ✅ Gestion de timeouts et AbortSignal sur toutes les requêtes HTTP

### Performance

- ⚡ API JSON directe (aucun parsing HTML)
- ⚡ Requêtes optimisées avec paramètres de tri/filtre côté serveur
- ⚡ Cache en mémoire pour les opérations coûteuses

### Conformité

- 📐 Architecture VEGA App respectée scrupuleusement
- 📐 `types.ts` à la racine + sources dans `providers/{value}/` → sortie dans `dist/{value}/`
- 📐 Exports nommés stricts
- 📐 Compatible avec le compilateur officiel `npm run build`

---

<div align="center">

---

### Documentation technique interne

> Ce projet est maintenu selon les standards de développement de la communauté VEGA.
> Toute modification doit passer par une revue de code et une validation de compilation.

---

</div>
