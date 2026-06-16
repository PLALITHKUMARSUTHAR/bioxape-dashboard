import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'serve-parent-static-files',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url, 'http://localhost');
          const pathname = url.pathname;

          // Serve parent-level HTML files
          if (pathname.endsWith('.html') || ['/login', '/register', '/admin', '/editor', '/author', '/store', '/research', '/post'].includes(pathname)) {
            let filename = pathname;
            if (!filename.endsWith('.html')) {
              filename += '.html';
            }
            const filePath = resolve(__dirname, '..', filename.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'text/html');
              res.end(fs.readFileSync(filePath));
              return;
            }
          }

          // Serve parent-level CSS/JS and assets
          if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/assets/')) {
            const filePath = resolve(__dirname, '..', pathname.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
              const ext = pathname.split('.').pop().split('?')[0]; // Strip query params like ?v=1.0.1
              const mimeTypes = {
                css: 'text/css',
                js: 'application/javascript',
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                gif: 'image/gif',
                svg: 'image/svg+xml',
                ico: 'image/x-icon'
              };
              res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
              res.end(fs.readFileSync(filePath));
              return;
            }
          }

          next();
        });
      }
    }
  ],
  base: mode === 'production' ? '/forum/' : '/',
  build: {
    outDir: resolve(__dirname, 'dist/forum'),
    emptyOutDir: true
  }
}))
