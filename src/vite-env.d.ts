/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORS_GITHUB_REF?: string;
  readonly VITE_ORS_SCHEMA_URL?: string;
  readonly VITE_ORS_EXAMPLE_MINIMAL_URL?: string;
  readonly VITE_ORS_EXAMPLE_COMPLETE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
