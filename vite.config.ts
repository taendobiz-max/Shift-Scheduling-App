import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteSourceLocator } from "@metagptx/vite-plugin-source-locator";

// Custom plugin to add query parameters to script and link tags in HTML
function addVersionToAssets(): Plugin {
  const timestamp = Date.now();
  return {
    name: 'add-version-to-assets',
    transformIndexHtml(html) {
      // Add version query parameter to script and link tags
      return html
        .replace(
          /<script([^>]*) src="([^"]+)"/g,
          (match, attrs, src) => {
            if (src.includes('/assets/')) {
              return `<script${attrs} src="${src}?v=${timestamp}"`;
            }
            return match;
          }
        )
        .replace(
          /<link([^>]*) href="([^"]+)"/g,
          (match, attrs, href) => {
            if (href.includes('/assets/') && (href.endsWith('.css') || href.endsWith('.js'))) {
              return `<link${attrs} href="${href}?v=${timestamp}"`;
            }
            return match;
          }
        );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    viteSourceLocator({
      prefix: "mgx",
    }),
    react(),
    addVersionToAssets(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));
