// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public Lovable Cloud values (safe to ship). Fallback for publish builds that lack .env.
// NEVER add service-role or other secret keys here.
const PUBLIC_ENV = {
  VITE_SUPABASE_URL: "https://c--27f099cf-7bef-42cf-8a1f-e01f105b3046-prod.lovable.cloud",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_UyCzXyLI3OX1e6V4mWr9Jg_Nvyo9bqA",
  VITE_SUPABASE_PROJECT_ID: "eezlpdzmbylnkiljxppl",
};

const define = Object.fromEntries(
  Object.entries(PUBLIC_ENV).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(process.env[k] || v)]),
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { define },
});
