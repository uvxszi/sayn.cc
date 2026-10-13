// Builds the site into _site, the folder GitHub Pages publishes.
//
//   node scripts/build.js                    build once
//   node scripts/build.js --serve            build, then preview at http://localhost:4000 (rebuilds as you browse)
//   node scripts/build.js --require-images   fail if scripts/build-gallery.sh has not been run (used on GitHub)
//
// What goes in:
//   pages/*.html      one file per page: a comment with title, description and url, then the page's HTML
//   data/site.js      site name, header links, community links
//   data/gallery.js   the gallery entries
//   assets/, CNAME, robots.txt and the other files in the root are copied as they are
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const out = path.join(root, '_site');
const args = process.argv.slice(2);

const ORIGINALS = 'assets/gallery/originals';
const GENERATED = 'assets/gallery/generated';
const PAGE_SIZE = 100; // gallery entries per list page
const NOT_PUBLISHED = ['_site', 'scripts', 'pages', 'data', 'node_modules', 'README.md'];

// Load a project file fresh each time, so --serve picks up edits.
const load = (file) => {
  const full = require.resolve(path.join(root, file));
  delete require.cache[full];
  return require(full);
};

const today = new Date().toISOString().slice(0, 10);
// The date of the last commit that touched any of these files.
const lastChanged = (...sources) => {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--'].concat(sources), { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || today;
  } catch (error) {
    return today;
  }
};

// A page file starts with a comment holding "key: value" lines; the rest is the page's HTML.
function readPage(file) {
  const text = fs.readFileSync(path.join(root, 'pages', file), 'utf8').replace(/\r\n/g, '\n');
  const match = /^\s*<!--\n([\s\S]*?)\n-->\n?/.exec(text);
  if (!match) throw new Error('pages/' + file + ' must start with a <!-- ... --> block giving title, description and url.');
  const page = { file: 'pages/' + file, content: text.slice(match[0].length) };
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':');
    if (at > 0) page[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  for (const key of ['title', 'description', 'url']) {
    if (!page[key]) throw new Error('pages/' + file + ' is missing "' + key + ':" in its opening comment.');
  }
  return page;
}

// Sizes of every gallery image. scripts/build-gallery.sh records them when it makes the resized
// files; without it (no ImageMagick on this computer) the originals stand in for the previews.
function gallerySizes() {
  const manifest = path.join(root, GENERATED, 'sizes.ndjson');
  if (fs.existsSync(manifest)) {
    const sizes = {};
    for (const line of fs.readFileSync(manifest, 'utf8').split('\n').filter(Boolean)) {
      const entry = JSON.parse(line);
      sizes[entry.id] = entry;
    }
    return sizes;
  }
  if (args.includes('--require-images')) throw new Error('Resized gallery images are missing. Run scripts/build-gallery.sh first.');
  console.log('Note: resized gallery images not found, so previews use the original files. Fine for a local preview.');
  return null;
}

function pngSize(file) {
  const buffer = fs.readFileSync(path.join(root, file));
  if (buffer.toString('latin1', 1, 4) !== 'PNG') throw new Error(file + ': a local preview without ImageMagick only understands PNG files.');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function build() {
  const site = load('data/site.js');
  const T = load('scripts/templates.js');
  const entries = load('data/gallery.js');
  const sizes = gallerySizes();

  // 1. Start from a copy of everything that is published as it is.
  fs.rmSync(out, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  fs.mkdirSync(out);
  for (const name of fs.readdirSync(root)) {
    if (name.startsWith('.') || name.startsWith('_') || NOT_PUBLISHED.includes(name)) continue;
    fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
  }
  fs.rmSync(path.join(out, GENERATED, 'sizes.ndjson'), { force: true });

  const sitemap = [];
  const write = (url, html) => {
    const file = path.join(out, url.endsWith('/') ? url + 'index.html' : url);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  };

  // 2. Gallery entries, sorted by title.
  const megabytes = (file) => (fs.statSync(path.join(root, file)).size / 1e6).toFixed(2);
  const items = entries.map((entry) => {
    const id = entry.file.replace(/\.[^.]+$/, '');
    const original = ORIGINALS + '/' + entry.file;
    const size = sizes ? sizes[id] : null;
    if (sizes && !size) throw new Error('data/gallery.js lists ' + entry.file + ', but it is not in ' + ORIGINALS + '.');
    const { width, height } = size || pngSize(original);
    const fit = Math.min(1, 900 / Math.max(width, height));
    const downloads = [];
    for (const max of [2560, 1920]) {
      if (size && size['has_' + max]) {
        downloads.push({ url: '/' + GENERATED + '/' + id + '-' + max + '.png', width: size['width_' + max], height: size['height_' + max], sizeMb: size['size_' + max + '_mb'] });
      }
    }
    return {
      ...entry,
      id,
      url: '/gallery/' + id + '/',
      original: '/' + original,
      sizeMb: megabytes(original),
      width,
      height,
      preview: size ? '/' + GENERATED + '/' + id + '-preview.webp' : '/' + original,
      previewWidth: size ? size.preview_width : Math.round(width * fit),
      previewHeight: size ? size.preview_height : Math.round(height * fit),
      downloads,
      tags: entry.tags || [],
    };
  }).sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));

  for (const item of items) {
    const description = item.description + ' Original ' + item.width + ' × ' + item.height + ' image from the official Sayn gallery, with downloads.';
    write(item.url, T.layout({ url: item.url, title: item.title, description, image: item.preview, data: T.imageData(item) }, T.galleryItem(item)));
    sitemap.push({ url: item.url, lastmod: lastChanged('data/gallery.js', ORIGINALS + '/' + item.file), image: item.original });
  }

  // 3. Gallery lists: everything, then one list per tag. Long lists are split into pages.
  const allTags = [...new Set(items.flatMap((item) => item.tags))].sort();
  const galleryDate = lastChanged('data/gallery.js', ORIGINALS);
  const lists = [{ url: '/gallery/', title: 'Gallery', description: 'Official Sayn art, wallpapers, images and other visual material.', items }];
  for (const tag of allTags) {
    const name = tag.split(/[-_ ]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    lists.push({ url: '/gallery/tags/' + T.slug(tag) + '/', title: name + ' — Gallery', description: 'Sayn gallery items tagged ' + tag + '.', items: items.filter((item) => item.tags.includes(tag)) });
  }
  for (const list of lists) {
    const totalPages = Math.max(1, Math.ceil(list.items.length / PAGE_SIZE));
    const pageUrl = (n) => (n === 1 ? list.url : list.url + 'page/' + n + '/');
    for (let n = 1; n <= totalPages; n++) {
      const title = n === 1 ? list.title : list.title + ' — Page ' + n;
      const content = T.galleryList({
        title,
        description: list.description,
        firstUrl: list.url,
        items: list.items.slice((n - 1) * PAGE_SIZE, n * PAGE_SIZE),
        total: list.items.length,
        allTags,
        pageNumber: n,
        totalPages,
        prevUrl: n > 1 ? pageUrl(n - 1) : null,
        nextUrl: n < totalPages ? pageUrl(n + 1) : null,
      });
      write(pageUrl(n), T.layout({ url: pageUrl(n), title, description: list.description }, content));
      sitemap.push({ url: pageUrl(n), lastmod: galleryDate });
    }
  }

  // 4. The pages in pages/.
  const pages = fs.readdirSync(path.join(root, 'pages')).filter((file) => file.endsWith('.html')).map(readPage);
  for (const page of pages) {
    const content = page.content
      .replace(/<!--\s*network\s*-->/g, T.networkItems().trim())
      .replace(/<!--\s*gallery-count\s*-->/g, items.length + ' entries');
    write(page.url, T.layout({
      url: page.url,
      title: page.title,
      seoTitle: page.seo_title,
      description: page.description,
      robots: page.robots,
      bodyClass: page.body_class,
      data: page.url === '/' ? T.websiteData(page.description) : null,
    }, content));
    if (page.robots !== 'noindex') sitemap.unshift({ url: page.url, lastmod: lastChanged(page.file) });
  }

  // 5. Sitemap, with the date each page last changed and the full-size image for gallery entries.
  sitemap.sort((x, y) => x.url.split('/').length - y.url.split('/').length || x.url.localeCompare(y.url));
  const xml = sitemap.map((entry) => '  <url>\n    <loc>' + T.esc(T.absolute(entry.url)) + '</loc>\n    <lastmod>' + entry.lastmod + '</lastmod>\n'
    + (entry.image ? '    <image:image>\n      <image:loc>' + T.esc(encodeURI(T.absolute(entry.image))) + '</image:loc>\n    </image:image>\n' : '')
    + '  </url>\n').join('');
  fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset\n  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + xml + '</urlset>\n');

  return sitemap.length;
}

console.log('Built _site: ' + build() + ' pages in the sitemap for ' + load('data/site.js').url);

// Local preview: serves _site the way GitHub Pages does, rebuilding when a page is opened
// after something in the project has changed.
if (args.includes('--serve')) {
  // The newest "last saved" time of anything the site is built from.
  const newest = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((latest, entry) => {
    if (entry.name.startsWith('.') || entry.name === '_site' || entry.name === 'node_modules') return latest;
    const full = path.join(dir, entry.name);
    return Math.max(latest, entry.isDirectory() ? newest(full) : fs.statSync(full).mtimeMs);
  }, 0);
  let builtAt = newest(root);
  const rebuildIfChanged = () => {
    const now = newest(root);
    if (now === builtAt) return;
    build();
    builtAt = now;
  };

  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };
  const port = Number(args[args.indexOf('--serve') + 1]) || 4000;
  http.createServer((request, response) => {
    const url = decodeURIComponent(request.url.split('?')[0]);
    const send = (status, file) => {
      response.writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(fs.readFileSync(file));
    };
    try {
      if (url.endsWith('/') || url.endsWith('.html')) rebuildIfChanged();
      const file = path.join(out, url.endsWith('/') ? url + 'index.html' : url);
      if (file.startsWith(out) && fs.existsSync(file) && fs.statSync(file).isFile()) return send(200, file);
      send(404, path.join(out, '404.html'));
    } catch (error) {
      console.error(error);
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Build error:\n' + error.stack);
    }
  }).listen(port, () => console.log('Preview at http://localhost:' + port + '  (Ctrl+C to stop)'));
}
