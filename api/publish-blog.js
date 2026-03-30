// Vercel Serverless Function: GetAutoSEO Webhook → GitHub → Auto-deploy blog post
// Uses Git Trees API to make ALL changes in a SINGLE commit (no race conditions)

const https = require('https');

const GITHUB_OWNER = 'andrewg999';
const GITHUB_REPO = 'echelon-facilitation-website';
const GITHUB_BRANCH = 'master';
const WEBHOOK_SECRET = 'aseo_wh_a3fe1430e67e8da0474dceda81f0e239';

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${(process.env.GITHUB_TOKEN || '').trim()}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'echelon-blog-publisher',
        'X-GitHub-Api-Version': '2022-11-28',
      }
    };
    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function estimateReadTime(html) {
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function extractFirstParagraph(html) {
  const match = html.match(/<p[^>]*>(.*?)<\/p>/s);
  if (match) {
    return match[1].replace(/<[^>]*>/g, '').substring(0, 220).trim();
  }
  return '';
}

function generateBlogPostHTML(article) {
  const title = article.title || 'Untitled Post';
  const slug = article.slug || slugify(title);
  // GetAutoSEO confirmed field names: content_html, content_markdown, heroImageUrl, metaDescription, heroImageAlt, infographicImageUrl
  const content = article.content_html || article.content_markdown || article.html || article.content || article.body || article.article_html || article.article_content || article.article_body || article.text || article.article || '';
  const description = article.metaDescription || article.meta_description || article.description || article.excerpt || article.summary || article.seo_description || extractFirstParagraph(content);
  const category = article.category || article.tag || article.topic || article.search_term || 'insights';
  const categorySlug = slugify(category);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const readTime = estimateReadTime(content);
  const heroImage = article.heroImageUrl || article.hero_image || article.featured_image || article.image || article.hero_image_url || article.featured_image_url || article.image_url || article.thumbnail || '';
  const heroAlt = article.heroImageAlt || title;

  const heroImageTag = heroImage
    ? `      <img src="${heroImage}" alt="${heroAlt.replace(/"/g, '&quot;')}" class="blog-post-hero-image">\n`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MTKCD8SJJK"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-MTKCD8SJJK');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Echelon Facilitation</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:type" content="article">
  <link rel="canonical" href="https://www.echelonfacilitation.com/blog/${slug}.html">
  <link rel="icon" type="image/png" href="../assets/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>

  <nav class="nav">
    <div class="nav-inner">
      <a href="../index.html" class="nav-logo">
        <img src="../assets/logo-color.png" alt="Echelon Facilitation">
      </a>
      <ul class="nav-links">
        <li><a href="../about.html">About</a></li>
        <li><a href="../how-we-work.html">How We Work</a></li>
        <li><a href="../workshops.html">Workshops</a></li>
        <li><a href="../case-study.html">Case Studies</a></li>
        <li><a href="../resources.html">Resources</a></li>
        <li><a href="../blog.html" style="color: var(--teal);">Blog</a></li>
        <li><a href="../contact.html">Contact</a></li>
      </ul>
      <a href="../contact.html" class="btn btn-primary btn-sm nav-cta">Book a Discovery Call</a>
      <button class="nav-toggle" onclick="document.querySelector('.mobile-menu').classList.toggle('active')" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
  <div class="mobile-menu">
    <a href="../about.html">About</a>
    <a href="../how-we-work.html">How We Work</a>
    <a href="../workshops.html">Workshops</a>
    <a href="../case-study.html">Case Studies</a>
    <a href="../resources.html">Resources</a>
    <a href="../blog.html">Blog</a>
    <a href="../contact.html">Contact</a>
    <a href="../contact.html" class="btn btn-primary">Book a Discovery Call</a>
  </div>

  <article class="blog-post">
    <div class="container">
      <div class="blog-post-header">
        <a href="../blog.html" class="blog-back-link">&larr; Back to Blog</a>
        <span class="section-label">${categorySlug}</span>
        <h1>${title}</h1>
        <div class="blog-post-meta">
          <span>Dr Andrew Greenland</span>
          <span>&bull;</span>
          <span>${date}</span>
          <span>&bull;</span>
          <span>${readTime} min read</span>
        </div>
      </div>
${heroImageTag}      <div class="blog-post-content">

${content}

      </div>
    </div>
  </article>

  <section class="cta-banner">
    <div class="container">
      <h2>Ready to transform how your team makes decisions?</h2>
      <p class="lead">Book a free 30-minute discovery call to discuss your leadership team&rsquo;s challenges.</p>
      <a href="../contact.html" class="btn btn-primary btn-lg">Book a Discovery Call</a>
    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="../assets/logo-color.png" alt="Echelon Facilitation" style="height: 36px; margin-bottom: 12px;">
          <p>High-stakes facilitation for leadership teams who need decisions, not more discussion. Based in Twickenham, UK.</p>
        </div>
        <div>
          <h4>Services</h4>
          <ul class="footer-links">
            <li><a href="../workshops.html">Executive Alignment Sprint</a></li>
            <li><a href="../workshops.html">Strategy Offsite</a></li>
            <li><a href="../workshops.html">All Workshops</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul class="footer-links">
            <li><a href="../about.html">About</a></li>
            <li><a href="../how-we-work.html">How We Work</a></li>
            <li><a href="../case-study.html">Case Studies</a></li>
            <li><a href="../blog.html">Blog</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul class="footer-links">
            <li><a href="mailto:hello@echelonfacilitation.com">hello@echelonfacilitation.com</a></li>
            <li><a href="../contact.html">Book a Discovery Call</a></li>
            <li>Twickenham, UK</li>
            <li><a href="https://www.linkedin.com/in/andrewdgreenland/" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 Echelon Facilitation. All rights reserved.</span>
      </div>
    </div>
  </footer>
  <script>
    document.querySelectorAll('.mobile-menu a').forEach(a => {
      a.addEventListener('click', () => document.querySelector('.mobile-menu').classList.remove('active'));
    });
  </script>
</body>
</html>`;
}

function generateBlogCardHTML(article, slug) {
  const title = article.title || 'Untitled Post';
  const articleContent = article.content_html || article.content_markdown || article.html || article.content || article.body || article.article_html || article.article_content || article.article_body || article.text || article.article || '';
  const description = article.metaDescription || article.meta_description || article.description || article.excerpt || article.summary || article.seo_description || extractFirstParagraph(articleContent);
  const category = article.category || article.tag || article.topic || article.search_term || 'insights';
  const categorySlug = slugify(category);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const readTime = estimateReadTime(articleContent);
  const heroImage = article.heroImageUrl || article.hero_image || article.featured_image || article.image || article.hero_image_url || article.featured_image_url || article.image_url || article.thumbnail || '';
  const heroAlt = article.heroImageAlt || title;
  const imageTag = heroImage
    ? `\n          <img src="${heroImage}" alt="${heroAlt.replace(/"/g, '&quot;')}" class="blog-card-image">`
    : '';

  return `
        <a href="blog/${slug}.html" class="blog-card">${imageTag}
          <div class="blog-card-content">
            <span class="section-label">${categorySlug}</span>
            <h3>${title}</h3>
            <p>${description}</p>
            <div class="blog-card-meta">
              <span>${date}</span>
              <span>&bull;</span>
              <span>${readTime} min read</span>
            </div>
          </div>
        </a>`;
}

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify bearer token
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check GitHub token is configured
  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured in Vercel environment' });
  }

  try {
    const article = req.body;

    // Full diagnostic log - shows ALL field names and content lengths
    const fieldInfo = {};
    for (const [key, val] of Object.entries(article)) {
      if (typeof val === 'string') {
        fieldInfo[key] = `string(${val.length}) "${val.substring(0, 100)}${val.length > 100 ? '...' : ''}"`;
      } else if (typeof val === 'object' && val !== null) {
        fieldInfo[key] = `object(keys: ${Object.keys(val).join(', ')})`;
      } else {
        fieldInfo[key] = String(val);
      }
    }
    console.log('WEBHOOK PAYLOAD FIELDS:', JSON.stringify(fieldInfo, null, 2));

    const title = article.title;
    if (!title) {
      return res.status(400).json({ error: 'Missing article title' });
    }

    const slug = article.slug || slugify(title);
    const blogPostHTML = generateBlogPostHTML(article);
    const blogCardHTML = generateBlogCardHTML(article, slug);
    const today = new Date().toISOString().split('T')[0];

    // === USE GIT TREES API FOR ATOMIC SINGLE COMMIT ===

    // Step 1: Get the current HEAD commit SHA and tree SHA
    const refResult = await githubRequest('GET',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH}`);

    if (refResult.status !== 200) {
      console.error('Failed to get branch ref:', refResult.data);
      return res.status(500).json({ error: 'Failed to get branch ref', details: refResult.data });
    }

    const headCommitSha = refResult.data.object.sha;

    // Step 2: Get current commit to find its tree
    const commitResult = await githubRequest('GET',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits/${headCommitSha}`);

    const baseTreeSha = commitResult.data.tree.sha;

    // Step 3: Get current blog.html content
    const blogListResult = await githubRequest('GET',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/blog.html?ref=${GITHUB_BRANCH}`);

    let updatedBlogHTML = '';
    if (blogListResult.status === 200) {
      const currentBlogHTML = Buffer.from(blogListResult.data.content, 'base64').toString('utf-8');
      const insertMarker = '<div class="blog-grid">';
      const insertIndex = currentBlogHTML.indexOf(insertMarker);
      if (insertIndex !== -1) {
        updatedBlogHTML = currentBlogHTML.slice(0, insertIndex + insertMarker.length)
          + '\n' + blogCardHTML
          + currentBlogHTML.slice(insertIndex + insertMarker.length);
      }
    }

    // Step 4: Get current sitemap.xml content
    const sitemapResult = await githubRequest('GET',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/sitemap.xml?ref=${GITHUB_BRANCH}`);

    let updatedSitemap = '';
    if (sitemapResult.status === 200) {
      const currentSitemap = Buffer.from(sitemapResult.data.content, 'base64').toString('utf-8');
      const newEntry = `  <url>\n    <loc>https://www.echelonfacilitation.com/blog/${slug}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n</urlset>`;
      updatedSitemap = currentSitemap.replace('</urlset>', newEntry);
    }

    // Step 5: Create a new tree with ALL file changes at once
    const treeItems = [
      {
        path: `blog/${slug}.html`,
        mode: '100644',
        type: 'blob',
        content: blogPostHTML
      }
    ];

    if (updatedBlogHTML) {
      treeItems.push({
        path: 'blog.html',
        mode: '100644',
        type: 'blob',
        content: updatedBlogHTML
      });
    }

    if (updatedSitemap) {
      treeItems.push({
        path: 'sitemap.xml',
        mode: '100644',
        type: 'blob',
        content: updatedSitemap
      });
    }

    const treeResult = await githubRequest('POST',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees`, {
      base_tree: baseTreeSha,
      tree: treeItems
    });

    if (treeResult.status !== 201) {
      console.error('Failed to create tree:', treeResult.data);
      return res.status(500).json({ error: 'Failed to create git tree', details: treeResult.data });
    }

    // Step 6: Create a new commit pointing to the new tree
    const newCommitResult = await githubRequest('POST',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`, {
      message: `Add blog post: ${title}`,
      tree: treeResult.data.sha,
      parents: [headCommitSha]
    });

    if (newCommitResult.status !== 201) {
      console.error('Failed to create commit:', newCommitResult.data);
      return res.status(500).json({ error: 'Failed to create commit', details: newCommitResult.data });
    }

    // Step 7: Update the branch ref to point to the new commit
    const updateRefResult = await githubRequest('PATCH',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`, {
      sha: newCommitResult.data.sha
    });

    if (updateRefResult.status !== 200) {
      console.error('Failed to update ref:', updateRefResult.data);
      return res.status(500).json({ error: 'Failed to update branch', details: updateRefResult.data });
    }

    console.log(`Successfully published: ${slug} (atomic commit: ${newCommitResult.data.sha.substring(0, 7)})`);
    return res.status(200).json({
      success: true,
      slug: slug,
      url: `https://www.echelonfacilitation.com/blog/${slug}.html`,
      commit: newCommitResult.data.sha.substring(0, 7),
      message: `Blog post "${title}" published successfully. Vercel will auto-deploy.`
    });

  } catch (error) {
    console.error('Webhook error:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
