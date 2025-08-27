import { cpSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const pub = join(dist, 'public');

function copyIfExists(from, to) {
  if (existsSync(from)) {
    const st = statSync(from);
    cpSync(from, to, { recursive: st.isDirectory() });
    console.log(`[postbuild] copied ${from} -> ${to}`);
  }
}

function fixPaths(file) {
  if (existsSync(file)) {
    let html = readFileSync(file, 'utf8');
    html = html.replaceAll('../assets/', 'assets/');
    writeFileSync(file, html);
    console.log(`[postbuild] fixed asset paths in ${file}`);
  }
}

copyIfExists(join(pub, 'popup.html'), join(dist, 'popup.html'));
copyIfExists(join(pub, 'newtab.html'), join(dist, 'newtab.html'));
fixPaths(join(dist, 'popup.html'));
fixPaths(join(dist, 'newtab.html'));

// Ensure public icons (e.g., /icons/toby/*) are available at dist root
copyIfExists(join(pub, 'icons'), join(dist, 'icons'));
