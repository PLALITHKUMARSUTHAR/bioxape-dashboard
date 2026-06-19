import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = resolve(__dirname, '..');
  const clientDir = __dirname;
  const distDir = resolve(clientDir, 'dist');

  return {
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
      },
      {
        name: 'post-build-copy',
        closeBundle() {
          console.log('Copying parent static files and folders to dist...');
          const htmlFiles = [
            'admin.html',
            'author.html',
            'editor.html',
            'index.html',
            'login.html',
            'register.html',
            'category.html',
            'post.html',
            'research.html',
            'store.html'
          ];

          htmlFiles.forEach(file => {
            const src = join(rootDir, file);
            const dest = join(distDir, file);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
              console.log(`Copied ${file} to dist/`);
            }
          });

          const dirs = ['css', 'js', 'assets', 'public-pages'];
          dirs.forEach(dir => {
            const src = join(rootDir, dir);
            const dest = join(distDir, dir);
            if (fs.existsSync(src)) {
              fs.cpSync(src, dest, { recursive: true });
              console.log(`Copied ${dir} directory to dist/`);
            }
          });

          console.log('Copying compiled forum to root forum/ directory...');
          const srcForum = join(distDir, 'forum');
          const destForum = join(rootDir, 'forum');

          if (fs.existsSync(destForum)) {
            fs.rmSync(destForum, { recursive: true, force: true });
          }
          fs.mkdirSync(destForum, { recursive: true });

          if (fs.existsSync(srcForum)) {
            fs.cpSync(srcForum, destForum, { recursive: true });
            console.log('Copied built forum to root forum/');
          }

          console.log('Copying client/dist to root dist/ directory...');
          const destRootDirDist = join(rootDir, 'dist');

          if (fs.existsSync(destRootDirDist)) {
            fs.rmSync(destRootDirDist, { recursive: true, force: true });
          }
          fs.mkdirSync(destRootDirDist, { recursive: true });

          if (fs.existsSync(distDir)) {
            fs.cpSync(distDir, destRootDirDist, { recursive: true });
            console.log('Copied built client/dist to root dist/');
          }
          console.log('Post-build copy finished successfully!');
        }
      }
    ],
    base: mode === 'production' ? '/forum/' : '/',
    build: {
      outDir: resolve(__dirname, 'dist/forum'),
      emptyOutDir: true
    }
  };
});
