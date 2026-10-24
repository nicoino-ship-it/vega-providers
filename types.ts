/**
 * providers/types.ts
 * 
 * Interfaces TypeScript officielles pour VEGA App Provider Template.
 * Ces types sont utilisés par tous les providers du dossier providers/.
 * Chaque provider importe depuis "../types".
 */

// ============================================================
// ProviderContext — Utilitaires injectés par VEGA
// ============================================================

export interface ProviderContext {
  axios: AxiosInstance;
  cheerio: CheerioAPI;
  commonHeaders: Record<string, string>;
  kvStore: ProviderKvStore;
  openWebView?: (
    url: string,
    options?: WebViewOptions
  ) => Promise<WebViewResult>;
}

export interface AxiosInstance {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>>;
}

export interface AxiosRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  responseType?: string;
  signal?: AbortSignal;
}

export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface CheerioAPI {
  load: (html: string) => CheerioRoot;
}

export interface CheerioRoot {
  (selector: string): CheerioElement;
}

export interface CheerioElement {
  text: () => string;
  attr: (name: string) => string | undefined;
  find: (selector: string) => CheerioElement;
  each: (fn: (i: number, el: any) => void) => void;
}

// Key-Value Store persistant par provider
export interface ProviderKvStore {
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
  clear: () => Promise<void>;
}

// WebView interactif pour WAF / vérifications
export interface WebViewOptions {
  title?: string;
  waitForCookie?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  injectedJavaScript?: string;
}

export interface WebViewResult {
  data: any;
  cookies: Array<{ name: string; value: string }>;
  cookieMap: Record<string, string>;
  url: string;
  userAgent: string;
}

// ============================================================
// Catalog — Catégories et genres
// ============================================================

export interface CatalogEntry {
  title: string;
  filter: string;
}

export interface GenreEntry {
  title: string;
  filter: string;
}

// ============================================================
// Post — Élément de liste (chaîne, film, série)
// ============================================================

export interface Post {
  id: string;
  name: string;
  posterUrl?: string | null;
  description?: string | null;
  link: string;
  image?: string;
  type?: string;
  extra?: Record<string, any>;
}

// ============================================================
// Info — Métadonnées détaillées d'un élément
// ============================================================

export interface Info {
  title: string;
  synopsis?: string;
  image?: string;
  imdbId?: string;
  type?: string;
  linkList?: LinkListEntry[];
  link?: string;
  extra?: Record<string, any>;
}

export interface LinkListEntry {
  title: string;
  episodesLink?: string;
  directLinks?: DirectLink[];
  quality?: string;
}

export interface DirectLink {
  link: string;
  title: string;
  type: string;
  quality?: string;
}

// ============================================================
// Stream — Source de lecture vidéo
// ============================================================

export interface Stream {
  server: string;
  link: string;
  type: string;        // "m3u8", "mp4", "dash"
  quality?: string;
  headers?: Record<string, string>;
}

// ============================================================
// EpisodeLink — Épisodes (optionnel)
// ============================================================

export interface EpisodeLink {
  title: string;
  link: string;
}

// ============================================================
// Settings — Paramètres du provider (optionnel)
// ============================================================

export type SettingsField =
  | SelectField
  | MultiSelectField
  | ToggleField
  | TextField
  | NumberField;

export interface SelectField {
  key: string;
  type: "select";
  label: string;
  description?: string;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
}

export interface MultiSelectField {
  key: string;
  type: "multiselect";
  label: string;
  description?: string;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string[];
}

export interface ToggleField {
  key: string;
  type: "toggle";
  label: string;
  description?: string;
  defaultValue?: boolean;
}

export interface TextField {
  key: string;
  type: "text";
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
}

export interface NumberField {
  key: string;
  type: "number";
  label: string;
  description?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
}
