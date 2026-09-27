// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      watch: {
        // El plugin de rutas reescribe routeTree.gen.ts cada pocos segundos
        // aunque el contenido no cambie. Vite veia cada reescritura como un
        // cambio y recargaba la pagina en bucle: era imposible ni escribir
        // en un formulario. Dejando de vigilar ese archivo, se acaba el bucle.
        //
        // A cambio: si agregamos o quitamos una pantalla, hay que reiniciar
        // el servidor para que la tome. Vale la pena.
        ignored: ["**/src/routeTree.gen.ts"],
      },
    },
  },
});
