// The HTML around and inside every page: head, header, footer, and the gallery pages.
// build.js calls these; pages/*.html only hold what goes between the header and the footer.

const site = require('../data/site');

const esc = (text) => String(text == null ? '' : text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const absolute = (url) => (/^https?:/.test(url) ? url : site.url + url);
const structuredData = (data) => '  <script type="application/ld+json">\n' + JSON.stringify(data, null, 2) + '\n  </script>\n';
const author = { '@type': 'Person', name: site.author.name, url: site.author.url };

// A row of links where the one for the current page is marked.
const links = (items, isCurrent) => items
  .map((item) => '  <a href="' + esc(item.url) + '"' + (isCurrent(item) ? ' aria-current="page"' : '') + '>' + esc(item.title) + '</a>\n')
  .join('');

// <li> items for the community links: used by <!-- network --> in pages.
const networkItems = () => site.network
  .map((link) => '  <li>\n    <a href="' + esc(link.url) + '">' + esc(link.title) + '</a><br>\n    ' + esc(link.description) + '\n  </li>\n')
  .join('');

/**
 * The whole page.
 * page: { url, title, seoTitle, description, image, robots, bodyClass, data }
 */
function layout(page, content) {
  const title = page.seoTitle || page.title + ' — ' + site.title;
  const description = page.description || site.description;
  const image = absolute(page.image || '/assets/brand/sayn-icon-180.png');
  const here = absolute(page.url);
  const inSection = (item) => page.url === item.url || (item.url !== '/' && page.url.startsWith(item.url));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">

  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/png" sizes="96x96" href="/assets/brand/sayn-icon-96.png">
  <link rel="apple-touch-icon" href="/assets/brand/sayn-icon-180.png">
  <link rel="stylesheet" href="/assets/css/style.css">

  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${esc(page.robots || 'index, follow')}">
  <link rel="canonical" href="${esc(here)}">

  <meta property="og:site_name" content="${esc(site.title)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(here)}">
  <meta property="og:image" content="${esc(image)}">
  <meta name="twitter:card" content="summary">
${page.data ? structuredData(page.data) : ''}</head>

<body${page.bodyClass ? ' class="' + esc(page.bodyClass) + '"' : ''}>
  <a class="skip" href="#main">Skip to content</a>

  <header class="site-header">
    <a class="brand" href="/">
      <img src="/assets/brand/sayn-icon-96.png" alt="" width="48" height="48">
      <span class="brand-name">sayn</span>
      <span class="brand-tag">strange encounters sayn</span>
    </a>
    <nav aria-label="Main">
${links(site.nav, inSection)}    </nav>
  </header>

  <main id="main">
${content.trim()}
  </main>

  <footer class="site-footer">
    <p>
      <span class="mark">sayn.cc</span> · ${esc(site.tagline)} · This site is incomplete.
    </p>
    <p>
      ${site.network.map((link) => '<a href="' + esc(link.url) + '">' + esc(link.title) + '</a> · ').join('')}made by <a href="${esc(site.author.url)}">${esc(site.author.name)}</a>
    </p>
  </footer>
</body>
</html>
`;
}

// Structured data for the home page.
const websiteData = (description) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: site.title,
  alternateName: site.tagline,
  url: absolute('/'),
  description,
  author,
});

const tagLinks = (tags) => tags.map((tag) => '<a href="/gallery/tags/' + slug(tag) + '/">' + esc(tag) + '</a>').join(' · ');
const sizeAttrs = (item) => (item.previewWidth ? ' width="' + item.previewWidth + '" height="' + item.previewHeight + '"' : '');

/**
 * A gallery list: the main gallery or one tag.
 * list: { url, title, description, items, allTags, pageNumber, totalPages, prevUrl, nextUrl }
 */
function galleryList(list) {
  const tags = [{ title: 'all', url: '/gallery/' }].concat(list.allTags.map((tag) => ({ title: tag, url: '/gallery/tags/' + slug(tag) + '/' })));

  const items = list.items.map((item) => `  <div class="gallery-item">
    <a href="${item.url}">
      <img src="${esc(item.preview)}" alt="${esc(item.alt)}"${sizeAttrs(item)} loading="lazy">
    </a>

    <p>
      <a href="${item.url}">${esc(item.title)}</a>
      <small>${item.width} × ${item.height}</small>
    </p>

    <p class="gallery-tags">
      ${tagLinks(item.tags)}
    </p>
  </div>
`).join('');

  const pagination = list.totalPages > 1 ? `
<p class="pagination">
  ${list.prevUrl ? '<a href="' + list.prevUrl + '">← Previous</a>' : ''}
  <span>Page ${list.pageNumber} of ${list.totalPages}</span>
  ${list.nextUrl ? '<a href="' + list.nextUrl + '">Next →</a>' : ''}
</p>
` : '';

  return `<h1>${esc(list.title)}</h1>

<p class="lede">
  ${esc(list.description)}
</p>

<h2>Tags</h2>

<p class="tag-list">
${links(tags, (tag) => tag.url === list.firstUrl)}</p>

<h2>Gallery <small>${list.total} entries</small></h2>

<div class="gallery-grid">
${items}</div>
${pagination}`;
}

/**
 * One gallery entry.
 * item: { url, title, description, alt, file, tags, preview, width, height, sizeMb, downloads: [{ url, width, height, sizeMb }] }
 */
function galleryItem(item) {
  const downloads = item.downloads.map((download) => `  <li>
    <a href="${esc(download.url)}" download>${download.width} × ${download.height} (${download.sizeMb} MB)</a><br>
    Reduced resolution.
  </li>
`).join('');

  return `<h1>${esc(item.title)}</h1>

<p class="lede">
  ${esc(item.description)}
</p>

<p>
  <img class="gallery-preview" src="${esc(item.preview)}" alt="${esc(item.alt)}"${sizeAttrs(item)}>
</p>

<p class="gallery-tags">
  Tags: ${tagLinks(item.tags)}
</p>

<h2>Downloads</h2>

<ul class="pages">
  <li>
    <a href="${esc(item.original)}" download>Original — ${item.width} × ${item.height} (${item.sizeMb} MB)</a><br>
    Original full-resolution file.
  </li>
${downloads}</ul>

<p>
  <a href="/gallery/">← Back to gallery</a>
</p>
`;
}

// Structured data for one gallery entry.
const imageData = (item) => ({
  '@context': 'https://schema.org',
  '@type': 'ImageObject',
  name: item.title,
  description: item.description,
  url: absolute(item.url),
  contentUrl: absolute(item.original),
  thumbnailUrl: absolute(item.preview),
  width: item.width,
  height: item.height,
  creator: author,
});

module.exports = { esc, slug, absolute, layout, networkItems, websiteData, galleryList, galleryItem, imageData };
