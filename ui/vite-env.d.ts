interface ImportMetaEnv {
  readonly VITE_SOCKET_SERVER: string;
  readonly VITE_API_ROOT: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
