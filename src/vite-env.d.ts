/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Public queer map base URL (iframe builder default + login “open map” link). Optional; app has a default. */
    readonly VITE_QUEER_MAP_EMBED_URL?: string;
}
