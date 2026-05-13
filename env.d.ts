/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_MAX_REQUESTS_PER_MINUTE?: string
  readonly VITE_CACHE_DURATION?: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_UNSPLASH_ACCESS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
