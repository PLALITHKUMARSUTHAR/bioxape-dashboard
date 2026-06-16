import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const clientDir = __dirname;
const distDir = path.resolve(clientDir, 'dist');

console.log('Building client React application with Vite...');
execSync('npx vite build', { stdio: 'inherit', cwd: clientDir });

console.log('Copying parent static files and folders to dist...');

// Copy files
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
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to dist/`);
  }
});

// Copy directories
const dirs = ['css', 'js', 'assets', 'public-pages'];
dirs.forEach(dir => {
  const src = path.join(rootDir, dir);
  const dest = path.join(distDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied ${dir} directory to dist/`);
  }
});

// Copy dist/forum to ../forum (so git and root static-site deployment works too)
console.log('Copying compiled forum to root forum/ directory...');
const srcForum = path.join(distDir, 'forum');
const destForum = path.join(rootDir, 'forum');

// Recreate root forum directory if it doesn't exist
if (fs.existsSync(destForum)) {
  fs.rmSync(destForum, { recursive: true, force: true });
}
fs.mkdirSync(destForum, { recursive: true });

if (fs.existsSync(srcForum)) {
  fs.cpSync(srcForum, destForum, { recursive: true });
  console.log('Copied built forum to root forum/');
}

// Copy dist to ../dist (for root-level Vercel build deployments expecting dist/ folder)
console.log('Copying client/dist to root dist/ directory...');
const destRootDirDist = path.join(rootDir, 'dist');

if (fs.existsSync(destRootDirDist)) {
  fs.rmSync(destRootDirDist, { recursive: true, force: true });
}
fs.mkdirSync(destRootDirDist, { recursive: true });

if (fs.existsSync(distDir)) {
  fs.cpSync(distDir, destRootDirDist, { recursive: true });
  console.log('Copied built client/dist to root dist/');
}

console.log('Build and copy finished successfully!');
