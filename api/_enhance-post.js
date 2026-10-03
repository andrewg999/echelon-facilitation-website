// Adds AI-search signals to a blog post page: machine-readable dates, BlogPosting /
// FAQPage / BreadcrumbList schema, clean heading order and a contents list.
// Used by publish-blog.js for new posts and by the backfill script for existing ones.
// The leading underscore stops Vercel treating this file as an API route.

const SITE = 'https://www.echelonfacilitation.com';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"').replace(/&ndash;|&mdash;/g, '-')
    .replace(/&bull;/g, '').replace(/&#39;/g, "'").replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function slugify(text) {
  return stripTags(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
}

// '22 March 2026' -> '2026-03-22'
function parseDisplayDate(s) {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}


function absoluteUrl(src) {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  return SITE + '/' + src.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
}

// Never skip a heading level: each heading sits one level below its nearest higher-ranked
// heading, so a run of h4s straight after an h2 all become h3s. onChange(original, fixed, attrs)
// can rewrite the attributes of a moved heading (e.g. to keep its styling).
function normaliseHeadings(html, startLevel, minLevel = 1, onChange) {
  const stack = [{ orig: startLevel, level: startLevel }];
  return html.replace(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (all, lvl, attrs = '', inner) => {
    const orig = Number(lvl);
    while (stack.length > 1 && stack[stack.length - 1].orig >= orig) stack.pop();
    const top = stack[stack.length - 1];
    const level = Math.max(minLevel, top.orig < orig ? Math.min(orig, top.level + 1) : orig);
    stack.push({ orig, level });
    if (level === orig) return all;
    const newAttrs = onChange ? onChange(orig, level, attrs) : attrs;
    return `<h${level}${newAttrs}>${inner}</h${level}>`;
  });
}

function extractFaqs(content) {
  const faqHeading = /<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(frequently asked|faqs?\b)(?:(?!<\/h2>)[\s\S])*?<\/h2>/i.exec(content);
  if (!faqHeading) return [];
  let section = content.slice(faqHeading.index + faqHeading[0].length);
  // The FAQ ends at the next h2 or at the author box, whichever comes first.
  const stops = [section.search(/<h2[\s>]/), section.indexOf('<div class="author-box"')].filter(i => i !== -1);
  if (stops.length) section = section.slice(0, Math.min(...stops));
  const faqs = [];
  const parts = section.split(/<h3[^>]*>/).slice(1);
  for (const part of parts) {
    const end = part.indexOf('</h3>');
    if (end === -1) continue;
    const question = stripTags(part.slice(0, end));
    const answer = stripTags(part.slice(end + 5));
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs.length >= 2 ? faqs : [];
}

function enhancePost(html, opts = {}) {
  if (html.includes('id="post-schema"')) return html; // already enhanced

  const contentStart = html.indexOf('<div class="blog-post-content">');
  const contentEnd = html.lastIndexOf('</article>');
  if (contentStart === -1 || contentEnd === -1) return html;
  const openTag = '<div class="blog-post-content">';
  const before = html.slice(0, contentStart + openTag.length);
  let content = html.slice(contentStart + openTag.length, contentEnd);
  const after = html.slice(contentEnd);

  // 1. Drop thin Article schema that some posts carry inline; the full version goes in <head>.
  content = content.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
    (block) => (/"@type":\s*"(Article|BlogPosting)"/.test(block) ? '' : block));

  // 2. One h1 per page, no skipped levels.
  content = normaliseHeadings(content, 1, 2);

  // 3. Every h2 gets an id so it can be linked from the contents list.
  const usedIds = new Set();
  content = content.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (all, attrs = '', inner) => {
    const existing = /\sid="([^"]+)"/.exec(attrs);
    if (existing) { usedIds.add(existing[1]); return all; }
    let id = slugify(inner) || 'section';
    while (usedIds.has(id)) id += '-2';
    usedIds.add(id);
    return `<h2 id="${id}"${attrs}>${inner}</h2>`;
  });

  // 4. Contents list for long posts that don't have one yet (same markup GetAutoSEO uses).
  const wordCount = stripTags(content).split(' ').length;
  if (!/class="table-of-contents"/.test(content)) {
    const sections = [...content.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)]
      .map(([, id, inner]) => ({ id, text: stripTags(inner) }));
    if (wordCount >= 1000 && sections.length >= 4) {
      const items = sections.map(s => `<li><a href="#${s.id}">${s.text}</a></li>`).join('\n');
      content = `\n<nav class="table-of-contents" aria-label="Table of Contents">\n<h2 id="table-of-contents">Table of Contents</h2>\n<ul>\n${items}\n</ul>\n</nav>\n` + content;
    }
  }

  let page = before + content + after;

  // 5. Dates: visible date becomes a <time> element. The modified date goes in the schema only.
  const metaBlock = /<div class="blog-post-meta">[\s\S]*?<\/div>/.exec(page);
  const visibleDate = metaBlock ? /<span>(\d{1,2} [A-Za-z]+ \d{4})<\/span>/.exec(metaBlock[0]) : null;
  const published = opts.datePublished || (visibleDate && parseDisplayDate(visibleDate[1]));
  let modified = opts.dateModified || published;
  if (published && modified < published) modified = published;
  if (metaBlock && visibleDate && published) {
    const meta = metaBlock[0].replace(visibleDate[0],
      `<span><time datetime="${published}">${visibleDate[1]}</time></span>`);
    page = page.replace(metaBlock[0], meta);
  }

  // 6. Schema in <head>.
  const titleMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(page);
  const headline = stripTags(titleMatch ? titleMatch[1] : (/<title>([^<|]*)/.exec(page) || [, ''])[1]);
  const description = stripTags((/<meta name="description" content="([^"]*)"/.exec(page) || [, ''])[1]);
  const canonical = (/<link rel="canonical" href="([^"]+)"/.exec(page) || [, ''])[1];
  const heroMatch = /<img[^>]*class="blog-post-hero-image"[^>]*>/.exec(page);
  const hero = heroMatch ? absoluteUrl((/src="([^"]+)"/.exec(heroMatch[0]) || [])[1]) : null;
  const faqs = extractFaqs(content);

  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': canonical + '#article',
      headline: headline.slice(0, 110),
      description,
      ...(published && { datePublished: published, dateModified: modified }),
      ...(hero && { image: hero }),
      wordCount,
      inLanguage: 'en-GB',
      mainEntityOfPage: canonical,
      author: { '@id': SITE + '/about.html#andrew-greenland' },
      publisher: { '@id': SITE + '/#organization' },
    },
    {
      '@type': 'Person',
      '@id': SITE + '/about.html#andrew-greenland',
      name: 'Dr Andrew Greenland',
      jobTitle: 'Founder & Lead Facilitator',
      url: SITE + '/about.html',
      worksFor: { '@id': SITE + '/#organization' },
      sameAs: ['https://www.linkedin.com/in/andrewdgreenland/'],
    },
    {
      '@type': 'Organization',
      '@id': SITE + '/#organization',
      name: 'Echelon Facilitation',
      url: SITE,
      logo: SITE + '/assets/logo-color.png',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog.html' },
        { '@type': 'ListItem', position: 3, name: headline, item: canonical },
      ],
    },
  ];
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)
    .replace(/</g, '\\u003c');
  const headTags = [
    published && `  <meta property="article:published_time" content="${published}">`,
    published && `  <meta property="article:modified_time" content="${modified}">`,
    hero && !/property="og:image"/.test(page) && `  <meta property="og:image" content="${hero}">`,
    `  <script type="application/ld+json" id="post-schema">\n${json}\n  </script>`,
  ].filter(Boolean).join('\n');

  return page.replace('</head>', headTags + '\n</head>');
}

module.exports = { enhancePost, extractFaqs, normaliseHeadings, parseDisplayDate };
