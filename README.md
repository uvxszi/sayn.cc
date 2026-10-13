# sayn.cc

The official site for Sayn and Strange Encounters Sayn: [sayn.cc](https://sayn.cc).

A small Node script builds the site and `.github/workflows/pages.yml` publishes it to GitHub Pages. Pushes to `main` build and publish; pushes to `dev` only build, as a check.

## What is where

- `pages/` — one file per page (home, about, project, links, 404)
- `data/site.js` — site name, header links, community links
- `data/gallery.js` — the gallery entries
- `assets/css/style.css` — all styling; the colors are the variables at the top
- `assets/gallery/originals/` — the gallery image files
- `assets/brand/`, `favicon.ico` — small versions of the Sayn icon
- `scripts/templates.js` — the HTML around every page (head, header, footer) and the gallery pages
- `scripts/build.js` — puts it all together into `_site`
- `scripts/build-gallery.sh` — makes previews and smaller sizes of the gallery images (needs ImageMagick)
- `scripts/indexnow.js` — tells search engines which pages changed

## Previewing on your computer

```bash
node scripts/build.js --serve
```

Then open http://localhost:4000. It rebuilds as you browse, so edit a file and reload. Without ImageMagick installed, gallery previews use the original image files and the smaller download sizes are left out; the published site has both.

## Adding a page

Create `pages/name.html` starting with a comment like this, followed by the page's HTML:

```text
<!--
title: Page title
description: One or two sentences saying what the page is. Shown in search results.
url: /name/
-->

<h1>Page title</h1>
```

Add it to `nav` in `data/site.js` if it should be in the header. Only link to pages that exist.

Two shortcuts work inside a page: `<!-- network -->` becomes the list of community links, and `<!-- gallery-count -->` becomes the number of gallery entries.

## Adding a gallery entry

1. Put the image in `assets/gallery/originals/`.
2. Add an entry to `data/gallery.js` (the format is explained at the top of that file).

The preview, the smaller download sizes, the gallery list and the tag pages are all made when the site is built.

## Search engines

- `sitemap.xml` is generated at build time, with each page's last-commit date and an image entry for every gallery item. There is no sitemap file in the repository.
- `robots.txt` points crawlers at the sitemap.
- Before publishing, the workflow compares the new build with the live site; after publishing, it submits the pages that differ to IndexNow (Bing, and through it DuckDuckGo).
- The long `.txt` file in the root is the IndexNow key. It is meant to be public and must not be renamed or deleted.
- The old `sayn-icon-*.ico` files in the root are linked from other sites, so keep them.
