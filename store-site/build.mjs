import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(process.cwd(), 'store-site');
const dist = join(root, 'dist');
const contentRoot = join(root, 'content');
const publicRoot = join(root, 'public');
const assetsRoot = join(root, 'assets');
const locales = ['tr', 'en'];
const siteOrigin = 'https://huntertrgy.github.io';
const githubPagesBasePath = '/buyukbaskan/';
const siteUrl = `${siteOrigin}${githubPagesBasePath.slice(0, -1)}`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function svgDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function appMarkSvg(className = 'brand-mark') {
  const classAttribute = className ? ` class="${className}"` : '';
  return `<svg${classAttribute} viewBox="0 0 512 512" role="img" aria-label="Büyük Başkan">
    <rect width="512" height="512" rx="84" fill="#07101a"/>
    <path d="M72 346 C 142 300 216 354 284 314 C 348 276 408 294 452 244 L452 432 L72 432 Z" fill="#0d5b37"/>
    <path d="M94 360 C 160 324 224 364 292 328 C 362 292 400 304 432 274" fill="none" stroke="#55d9ff" stroke-width="10" stroke-linecap="round"/>
    <rect x="122" y="88" width="268" height="236" rx="28" fill="#102031" stroke="#55d9ff" stroke-opacity="0.42" stroke-width="6"/>
    <path d="M176 286 h160 M176 238 h160 M176 190 h160" stroke="#9fb6c9" stroke-width="16" stroke-linecap="round"/>
    <circle cx="256" cy="148" r="44" fill="none" stroke="#79ff68" stroke-width="14"/>
    <path d="M256 100 v96 M208 148 h96" stroke="#f4d66f" stroke-width="8" stroke-linecap="round"/>
  </svg>`;
}

function heroArtSvg(content) {
  return `<svg class="hero-art" viewBox="0 0 1024 500" role="img" aria-label="${escapeHtml(content.home.heroAlt)}">
    <defs>
      <linearGradient id="hero-bg-${content.locale}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#081827"/>
        <stop offset="0.62" stop-color="#102a40"/>
        <stop offset="1" stop-color="#08121f"/>
      </linearGradient>
      <linearGradient id="hero-line-${content.locale}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#55d9ff"/>
        <stop offset="1" stop-color="#79ff68"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#hero-bg-${content.locale})"/>
    <path d="M0 380 C 164 304 312 430 500 354 C 698 276 812 318 1024 232 L1024 500 L0 500 Z" fill="#0b3d26" opacity="0.86"/>
    <path d="M54 404 C 214 344 326 432 512 368 C 728 294 820 334 972 284" fill="none" stroke="url(#hero-line-${content.locale})" stroke-width="5" stroke-linecap="round" opacity="0.72"/>
    <rect x="652" y="68" width="270" height="324" rx="26" fill="#07101a" stroke="#55d9ff" stroke-opacity="0.34" stroke-width="3"/>
    <rect x="686" y="106" width="202" height="130" rx="14" fill="#12304a" stroke="#ffffff" stroke-opacity="0.14"/>
    <circle cx="787" cy="171" r="38" fill="none" stroke="#79ff68" stroke-width="6" opacity="0.78"/>
    <path d="M724 262 h88 M724 302 h150 M724 342 h118" stroke-linecap="round" stroke-width="22" opacity="0.74" stroke="#55d9ff"/>
    <path d="M724 302 h150 M724 342 h118" stroke-linecap="round" stroke-width="22" opacity="0.52" stroke="#79ff68"/>
    <text x="72" y="190" fill="#eef8ff" font-family="Segoe UI, Arial, sans-serif" font-size="68" font-weight="900">${escapeHtml(content.brand)}</text>
    <text x="76" y="252" fill="#9fb6c9" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="800">${escapeHtml(content.home.lead)}</text>
    <path d="M78 326 h420" stroke="#f4d66f" stroke-width="4" opacity="0.78"/>
  </svg>`;
}

function sitePath(path = '') {
  const relative = String(path ?? '').replace(/^\/+/, '');
  return `${githubPagesBasePath}${relative}`.replace(/\/+/g, '/');
}

function pageUrl(locale, path = '') {
  const relative = String(path ?? '').replace(/^\/+/, '');
  return sitePath(`${locale}/${relative}`);
}

function link(locale, href) {
  if (href.startsWith('http')) return href;
  if (href === '/') return pageUrl(locale);
  return pageUrl(locale, href);
}

function navItems(content, activePath) {
  const normalizedActivePath = activePath === '/' ? '/' : activePath.replace(/^\/+/, '');
  return content.nav.items.map((item) => {
    const href = link(content.locale, item.href);
    const normalizedItemHref = item.href === '/' ? '/' : item.href.replace(/^\/+/, '');
    const active = normalizedActivePath === normalizedItemHref || (normalizedItemHref !== '/' && normalizedActivePath.startsWith(normalizedItemHref));
    return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
  }).join('');
}

function paragraphs(items = []) {
  return items.map((item) => `<p>${escapeHtml(item)}</p>`).join('');
}

function list(items = []) {
  if (items.length === 0) return '';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderSections(sections = []) {
  return sections.map((section) => `
    <section class="panel">
      <h2>${escapeHtml(section.heading)}</h2>
      ${paragraphs(section.paragraphs)}
      ${list(section.list)}
    </section>
  `).join('');
}

function renderCards(cards = [], locale) {
  return `<div class="wiki-grid">${cards.map((card) => `
    <a class="wiki-card" href="${link(locale, card.href)}">
      <span>${escapeHtml(card.kicker)}</span>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.summary)}</p>
    </a>
  `).join('')}</div>`;
}

function renderMetadata(store) {
  return `<div class="metadata-grid">${store.cards.map((card) => `
    <article class="metadata-card">
      <span>${escapeHtml(card.kicker)}</span>
      <h3>${escapeHtml(card.title)}</h3>
      ${paragraphs(card.paragraphs)}
      ${list(card.list)}
    </article>
  `).join('')}</div>`;
}

function layout(content, activePath, title, body, pageClass = '') {
  const languageHref = content.locale === 'tr' ? pageUrl('en') : pageUrl('tr');
  const description = content.home.lead;
  return `<!doctype html>
<html lang="${content.htmlLang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | ${escapeHtml(content.brand)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${siteOrigin}${pageUrl(content.locale, activePath === '/' ? '' : activePath)}">
    <link rel="alternate" hreflang="${content.locale === 'tr' ? 'en' : 'tr'}" href="${siteOrigin}${languageHref}">
    <link rel="icon" href="${svgDataUrl(appMarkSvg(''))}">
    <link rel="stylesheet" href="${sitePath('assets/site.css')}">
  </head>
  <body>
    <div class="site-shell ${pageClass}">
      <header class="site-header">
        <div class="site-header__inner">
          <a class="brand-lockup" href="${pageUrl(content.locale)}">
            ${appMarkSvg()}
            <span>
              <strong>${escapeHtml(content.brand)}</strong>
              <span>${escapeHtml(content.nav.brandMeta)}</span>
            </span>
          </a>
          <nav class="site-nav" aria-label="${escapeHtml(content.nav.ariaLabel)}">
            ${navItems(content, activePath)}
            <a href="${languageHref}">${escapeHtml(content.nav.languageSwitch)}</a>
          </nav>
        </div>
      </header>
      <main class="site-main">
        ${body}
      </main>
      <footer class="site-footer">
        <div class="site-footer__inner">
          <span>${escapeHtml(content.footer.notice)}</span>
          <span>${escapeHtml(content.footer.legal)}</span>
        </div>
      </footer>
    </div>
  </body>
</html>`;
}

async function writeHtml(path, html) {
  const target = join(dist, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}

function homePage(content) {
  const body = `
    <section class="hero">
      <div class="hero__copy">
        <span class="eyebrow">${escapeHtml(content.home.eyebrow)}</span>
        <h1>${escapeHtml(content.home.title)}</h1>
        <p class="lead">${escapeHtml(content.home.lead)}</p>
        <div class="hero__actions">
          ${content.home.actions.map((action, index) => `<a class="button ${index === 0 ? 'button--primary' : ''}" href="${link(content.locale, action.href)}">${escapeHtml(action.label)}</a>`).join('')}
        </div>
      </div>
      <div class="hero__visual">
        ${heroArtSvg(content)}
      </div>
    </section>
    <div class="stack">
      ${renderCards(content.home.cards, content.locale)}
      ${renderSections(content.home.sections)}
    </div>`;
  return layout(content, '/', content.home.title, body);
}

function legalPage(content, key, path) {
  const page = content[key];
  const body = `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(page.updatedLabel)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
    </section>
    <div class="stack">
      ${renderSections(page.sections)}
    </div>`;
  return layout(content, path, page.title, body, 'legal-page');
}

function wikiIndex(content) {
  const page = content.wiki;
  const body = `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(page.eyebrow)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
    </section>
    <div class="stack">
      ${renderCards(page.cards, content.locale)}
    </div>`;
  return layout(content, '/wiki/', page.title, body, 'wiki-page');
}

function wikiPage(content, page) {
  const path = `/wiki/${page.slug}/`;
  const body = `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(content.wiki.eyebrow)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
      <div class="button-row"><a class="button" href="${pageUrl(content.locale, 'wiki/')}">${escapeHtml(content.wiki.backLabel)}</a></div>
    </section>
    <div class="stack">
      ${renderSections(page.sections)}
    </div>`;
  return layout(content, path, page.title, body, 'wiki-page');
}

function storePage(content) {
  const page = content.store;
  const body = `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(page.eyebrow)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
    </section>
    <div class="stack">
      ${renderMetadata(page)}
      ${renderSections(page.sections)}
    </div>`;
  return layout(content, '/store/', page.title, body);
}

async function loadContent(locale) {
  return JSON.parse(await readFile(join(contentRoot, locale, 'site.json'), 'utf8'));
}

async function buildLocale(locale) {
  const content = await loadContent(locale);
  await writeHtml(`${locale}/index.html`, homePage(content));
  await writeHtml(`${locale}/privacy/index.html`, legalPage(content, 'privacy', '/privacy/'));
  await writeHtml(`${locale}/terms/index.html`, legalPage(content, 'terms', '/terms/'));
  await writeHtml(`${locale}/wiki/index.html`, wikiIndex(content));
  await writeHtml(`${locale}/store/index.html`, storePage(content));
  for (const page of content.wiki.pages) {
    await writeHtml(`${locale}/wiki/${page.slug}/index.html`, wikiPage(content, page));
  }
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  if (existsSync(publicRoot)) {
    await cp(publicRoot, dist, { recursive: true });
  }
  await cp(assetsRoot, join(dist, 'assets'), { recursive: true });
  await writeHtml('index.html', `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${pageUrl('tr')}"><link rel="canonical" href="${siteOrigin}${pageUrl('tr')}">`);
  for (const locale of locales) {
    await buildLocale(locale);
  }
  await writeHtml('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://huntertrgy.github.io/buyukbaskan/sitemap.xml\n');
  const urls = [];
  for (const locale of locales) {
    const content = await loadContent(locale);
    urls.push(`${siteUrl}/${locale}/`, `${siteUrl}/${locale}/privacy/`, `${siteUrl}/${locale}/terms/`, `${siteUrl}/${locale}/wiki/`, `${siteUrl}/${locale}/store/`);
    for (const page of content.wiki.pages) urls.push(`${siteUrl}/${locale}/wiki/${page.slug}/`);
  }
  await writeHtml('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
}

await main();
