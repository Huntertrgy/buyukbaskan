const BASE = '/buyukbaskan/';
const LOCALES = new Set(['tr', 'en']);

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
  return `${BASE}${relative}`.replace(/\/+/g, '/');
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

function playConsoleAsset(path) {
  return sitePath(`store-site/public/assets/play-console/${path}`);
}

function parseRoute() {
  const rel = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : '';
  const parts = rel.split('/').filter(Boolean);
  const first = parts[0];
  const locale = LOCALES.has(first) ? parts.shift() : 'tr';
  const section = parts[0] ?? '';
  if (!section) return { locale, activePath: '/', kind: 'home' };
  if (section === 'privacy') return { locale, activePath: '/privacy/', kind: 'privacy' };
  if (section === 'terms') return { locale, activePath: '/terms/', kind: 'terms' };
  if (section === 'store') return { locale, activePath: '/store/', kind: 'store' };
  if (section === 'wiki' && parts[1]) return { locale, activePath: `/wiki/${parts[1]}/`, kind: 'wikiPage', slug: parts[1] };
  if (section === 'wiki') return { locale, activePath: '/wiki/', kind: 'wikiIndex' };
  return { locale, activePath: '/', kind: 'home' };
}

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

function homeBody(content) {
  return `
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
}

function legalBody(content, key) {
  const page = content[key];
  return `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(page.updatedLabel)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
    </section>
    <div class="stack">${renderSections(page.sections)}</div>`;
}

function wikiIndexBody(content) {
  const page = content.wiki;
  return `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(page.eyebrow)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
    </section>
    <div class="stack">${renderCards(page.cards, content.locale)}</div>`;
}

function wikiPageBody(content, page) {
  return `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(content.wiki.eyebrow)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
      <div class="button-row"><a class="button" href="${pageUrl(content.locale, 'wiki/')}">${escapeHtml(content.wiki.backLabel)}</a></div>
    </section>
    <div class="stack">${renderSections(page.sections)}</div>`;
}

function storeBody(content) {
  const page = content.store;
  return `
    <section class="panel">
      <span class="eyebrow">${escapeHtml(page.eyebrow)}</span>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
    </section>
    <div class="stack">
      ${renderMetadata(page)}
      ${renderSections(page.sections)}
    </div>`;
}

function upsertLink(rel, href, hreflang) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let node = document.querySelector(selector);
  if (!node) {
    node = document.createElement('link');
    node.rel = rel;
    if (hreflang) node.hreflang = hreflang;
    document.head.append(node);
  }
  node.href = href;
}

function render(content, route) {
  const otherLocale = content.locale === 'tr' ? 'en' : 'tr';
  const languageHref = pageUrl(otherLocale, alternatePathForLocale(content.locale, route.activePath));
  let body = '';
  let title = content.home.title;
  let pageClass = '';

  if (route.kind === 'privacy' || route.kind === 'terms') {
    const key = route.kind;
    title = content[key].title;
    pageClass = 'legal-page';
    body = legalBody(content, key);
  } else if (route.kind === 'store') {
    title = content.store.title;
    body = storeBody(content);
  } else if (route.kind === 'wikiIndex') {
    title = content.wiki.title;
    pageClass = 'wiki-page';
    body = wikiIndexBody(content);
  } else if (route.kind === 'wikiPage') {
    const page = content.wiki.pages.find((candidate) => candidate.slug === route.slug) ?? content.wiki.pages[0];
    title = page.title;
    pageClass = 'wiki-page';
    body = wikiPageBody(content, page);
  } else {
    body = homeBody(content);
  }

  document.documentElement.lang = content.htmlLang;
  document.title = `${title} | ${content.brand}`;
  const metaDescription = document.querySelector('meta[name="description"]') ?? document.createElement('meta');
  metaDescription.name = 'description';
  metaDescription.content = content.home.lead;
  if (!metaDescription.parentElement) document.head.append(metaDescription);
  upsertLink('canonical', `${location.origin}${pageUrl(content.locale, route.activePath === '/' ? '' : route.activePath)}`);
  upsertLink('alternate', `${location.origin}${languageHref}`, otherLocale);

  const root = document.getElementById('site-root');
  root.className = `site-shell ${pageClass}`;
  root.innerHTML = `
    <header class="site-header">
      <div class="site-header__inner">
        <a class="brand-lockup" href="${pageUrl(content.locale)}">
          <img class="brand-mark" src="${playConsoleAsset('app-icon-512.png')}" alt="" width="42" height="42" aria-hidden="true">
          <span><strong>${escapeHtml(content.brand)}</strong><span>${escapeHtml(content.nav.brandMeta)}</span></span>
        </a>
        <nav class="site-nav" aria-label="${escapeHtml(content.nav.ariaLabel)}">
          ${navItems(content, route.activePath)}
          <a href="${languageHref}">${escapeHtml(content.nav.languageSwitch)}</a>
        </nav>
      </div>
    </header>
    <main class="site-main">${body}</main>
    <footer class="site-footer">
      <div class="site-footer__inner">
        <span>${escapeHtml(content.footer.notice)}</span>
        <span>${escapeHtml(content.footer.legal)}</span>
      </div>
    </footer>`;
}

async function main() {
  const route = parseRoute();
  const response = await fetch(sitePath(`store-site/content/${route.locale}/site.json`));
  const content = await response.json();
  render(content, route);
}

main().catch((error) => {
  console.error(error);
});
