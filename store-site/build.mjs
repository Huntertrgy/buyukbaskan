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

function sitePath(path = '') {
  const relative = String(path ?? '').replace(/^\/+/, '');
  return `${githubPagesBasePath}${relative}`.replace(/\/+/g, '/');
}

function playConsoleAsset(path) {
  return sitePath(`assets/play-console/${path}`);
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

const wikiSlugMirrors = {
  tr: {
    baslangic: 'getting-started',
    kariyer: 'career',
    finans: 'finance',
    transfer: 'transfers',
    'stadyum-tesisler': 'stadium-facilities',
    'mac-akisi': 'match-flow',
    sss: 'faq',
  },
  en: {
    'getting-started': 'baslangic',
    career: 'kariyer',
    finance: 'finans',
    transfers: 'transfer',
    'stadium-facilities': 'stadyum-tesisler',
    'match-flow': 'mac-akisi',
    faq: 'sss',
  },
};

function alternatePathForLocale(locale, activePath) {
  const normalized = activePath === '/' ? '' : String(activePath ?? '').replace(/^\/+|\/+$/g, '');
  const wikiMatch = normalized.match(/^wiki\/([^/]+)$/);
  if (!wikiMatch) return normalized ? `${normalized}/` : '';
  const mirroredSlug = wikiSlugMirrors[locale]?.[wikiMatch[1]] ?? wikiMatch[1];
  return `wiki/${mirroredSlug}/`;
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

function heroVisual(content) {
  const featureGraphic = playConsoleAsset(`feature-graphic-${content.locale}-1024x500.png`);
  const screenshots = content.home.screenshots ?? [];
  return `<div class="hero__visual">
    <img class="hero-feature" src="${featureGraphic}" alt="${escapeHtml(content.home.heroAlt)}" width="1024" height="500" loading="eager">
    ${screenshots.length ? `<div class="screenshot-rail" aria-label="${escapeHtml(content.home.screenshotsLabel)}">
      ${screenshots.map((shot) => `
        <img src="${playConsoleAsset(`screenshots/android-phone/${shot.file}`)}" alt="${escapeHtml(shot.alt)}" width="1080" height="1920" loading="lazy">
      `).join('')}
    </div>` : ''}
  </div>`;
}

function layout(content, activePath, title, body, pageClass = '') {
  const otherLocale = content.locale === 'tr' ? 'en' : 'tr';
  const languageHref = pageUrl(otherLocale, alternatePathForLocale(content.locale, activePath));
  const description = content.home.lead;
  return `<!doctype html>
<html lang="${content.htmlLang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | ${escapeHtml(content.brand)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${siteOrigin}${pageUrl(content.locale, activePath === '/' ? '' : activePath)}">
    <link rel="alternate" hreflang="${otherLocale}" href="${siteOrigin}${languageHref}">
    <link rel="icon" href="${playConsoleAsset('app-icon-512.png')}">
    <link rel="stylesheet" href="${sitePath('assets/site.css')}">
  </head>
  <body>
    <div class="site-shell ${pageClass}">
      <header class="site-header">
        <div class="site-header__inner">
          <a class="brand-lockup" href="${pageUrl(content.locale)}">
            <img class="brand-mark" src="${playConsoleAsset('app-icon-512.png')}" alt="" width="42" height="42" aria-hidden="true">
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
      ${heroVisual(content)}
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
