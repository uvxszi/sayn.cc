// Tells IndexNow (used by Bing, and through it DuckDuckGo) which pages changed, so they are
// re-crawled quickly. Run by .github/workflows/pages.yml in two steps:
//
//   node scripts/indexnow.js changed   before publishing: compare the freshly built _site with the
//                                      live site and print the addresses that differ (one per line)
//   node scripts/indexnow.js submit    after publishing: send the addresses in the URLS variable
//                                      (add --dry-run to print the request without sending it)
//
// The key is the name of a <key>.txt file in the repository root that also contains the key.
// It is public by design: it only proves that this site sent the request.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const site = path.join(root, '_site');
const origin = 'https://' + fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim();

const locs = (xml) => (xml.match(/<loc>[^<]+<\/loc>/g) || [])
  .map((loc) => loc.slice(5, -6).trim())
  .filter((url) => url.startsWith(origin + '/') && !url.includes('/assets/'));

const live = async (url) => {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok ? await response.text() : null;
  } catch (error) {
    return null;
  }
};

// The file Jekyll built for an address: /about/ -> _site/about/index.html
const built = (url) => {
  const page = decodeURI(new URL(url).pathname);
  const file = path.join(site, page.endsWith('/') ? page + 'index.html' : page);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};

async function changed() {
  const now = locs(fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8'));
  const before = locs((await live(origin + '/sitemap.xml')) || '');
  const urls = [];
  for (const url of now) {
    if (built(url) !== (await live(url))) urls.push(url);
  }
  // Pages that no longer exist: submit them too, so they are dropped from the index.
  for (const url of before) {
    if (!now.includes(url)) urls.push(url);
  }
  console.log(urls.join('\n'));
}

async function submit() {
  const urls = (process.env.URLS || '').split(/\s+/).filter(Boolean);
  if (!urls.length) return console.log('No page changed; nothing to submit.');

  const keyFile = fs.readdirSync(root).find((name) => /^[a-z0-9-]{8,128}\.txt$/i.test(name)
    && fs.readFileSync(path.join(root, name), 'utf8').trim() === name.replace(/\.txt$/, ''));
  if (!keyFile) return console.log('No IndexNow key file in the repository root; skipping.');

  const body = { host: new URL(origin).host, key: keyFile.replace(/\.txt$/, ''), keyLocation: origin + '/' + keyFile, urlList: urls };
  console.log(JSON.stringify(body, null, 2));
  if (process.argv.includes('--dry-run')) return console.log('Dry run, not sent.');

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log('IndexNow answered ' + response.status + ' ' + (await response.text()));
  if (response.status !== 200 && response.status !== 202) process.exitCode = 1;
}

({ changed, submit }[process.argv[2]] || (() => Promise.reject(new Error('Use: indexnow.js changed | submit'))))()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
