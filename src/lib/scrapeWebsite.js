const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { URL } = require('url');
const fetch = require('node-fetch');

/**
 * Scrape a website and its navigation pages using HTTP + Cheerio (no Chrome needed)
 * @param {string} mainUrl - The main website URL
 * @param {number} maxPages - Maximum number of navigation pages to scrape (default 5)
 * @returns {Promise<Array<{url: string, title: string, content: string}>>}
 */
async function scrapeWebsiteWithNavigation(mainUrl, maxPages = 5) {
  const scrapedPages = [];
  const visitedUrls = new Set();
  
  try {
    // Parse the main URL to get the domain
    const mainUrlObj = new URL(mainUrl);
    const baseDomain = mainUrlObj.origin;
    
    console.log(`🏠 Starting with main URL: ${mainUrl}`);
    
    // Step 1: Scrape the main page and get navigation links
    console.log(`📄 Fetching main page: ${mainUrl}`);
    
    const mainResponse = await fetchWithRetry(mainUrl);
    if (!mainResponse.ok) {
      throw new Error(`Failed to fetch ${mainUrl}: ${mainResponse.status}`);
    }
    
    const mainHtml = await mainResponse.text();
    const mainContent = extractContent(mainHtml, mainUrl);
    
    if (mainContent) {
      const $ = cheerio.load(mainHtml);
      const title = $('title').text().trim() || 'Home';
      
      scrapedPages.push({
        url: mainUrl,
        title: title,
        content: mainContent
      });
      visitedUrls.add(mainUrl);
      console.log(`✅ Main page scraped: ${title}`);
    }
    
    // Find navigation links using Cheerio
    const $ = cheerio.load(mainHtml);
    const navLinks = findNavigationLinks($, baseDomain, mainUrl);
    
    console.log(`🔗 Found ${navLinks.length} potential navigation links`);
    
    // Filter and prioritize navigation links
    const relevantLinks = filterRelevantLinks(navLinks, baseDomain, mainUrl);
    const linksToScrape = relevantLinks.slice(0, maxPages);
    
    console.log(`📋 Will scrape ${linksToScrape.length} additional pages`);
    
    // Step 2: Scrape the navigation pages
    for (const linkInfo of linksToScrape) {
      if (visitedUrls.has(linkInfo.url)) continue;
      
      try {
        console.log(`📄 Scraping: ${linkInfo.url}`);
        
        const response = await fetchWithRetry(linkInfo.url);
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch ${linkInfo.url}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        const content = extractContent(html, linkInfo.url);
        
        if (content && content.length > 100) {
          const $page = cheerio.load(html);
          const title = $page('title').text().trim() || linkInfo.text || 'Page';
          
          scrapedPages.push({
            url: linkInfo.url,
            title: title,
            content: content
          });
          visitedUrls.add(linkInfo.url);
          console.log(`✅ Scraped: ${title}`);
        }
        
        // Add a small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.warn(`⚠️ Failed to scrape ${linkInfo.url}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  }
  
  console.log(`✅ Successfully scraped ${scrapedPages.length} pages`);
  return scrapedPages;
}

/**
 * Fetch with retry logic and proper headers
 */
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000, // 30 second timeout
        follow: 5 // Follow up to 5 redirects
      });
      
      return response;
    } catch (error) {
      console.warn(`⚠️ Fetch attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

/**
 * Find navigation links using Cheerio
 */
function findNavigationLinks($, baseDomain, mainUrl) {
  const links = [];
  const foundLinks = new Set();
  
  // Strategy 1: Look for common navigation elements
  const navSelectors = [
    'nav a',
    'header a',
    '.nav a',
    '.navigation a',
    '.navbar a',
    '#nav a',
    '#navigation a',
    '.menu a',
    '#menu a',
    '.header-menu a',
    '[role="navigation"] a'
  ];
  
  navSelectors.forEach(selector => {
    $(selector).each((i, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (href && !foundLinks.has(href)) {
        try {
          // Handle relative URLs
          const fullUrl = new URL(href, mainUrl).href;
          const linkDomain = new URL(fullUrl).origin;
          
          // Only include same-domain links
          if (linkDomain === baseDomain) {
            foundLinks.add(fullUrl);
            links.push({
              url: fullUrl,
              text: text,
              isNavLink: true
            });
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
  });
  
  // Strategy 2: If no nav found, get prominent links from header area
  if (links.length === 0) {
    $('a').each((i, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (href && !foundLinks.has(href)) {
        try {
          const fullUrl = new URL(href, mainUrl).href;
          const linkDomain = new URL(fullUrl).origin;
          
          if (linkDomain === baseDomain) {
            // Simple heuristic: links in the first part of the page are likely navigation
            const linkHtml = $.html($link);
            const isLikelyNav = text.length < 50 && text.length > 2; // Reasonable nav link text length
            
            if (isLikelyNav) {
              foundLinks.add(fullUrl);
              links.push({
                url: fullUrl,
                text: text,
                isNavLink: false
              });
            }
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
  }
  
  return links;
}

/**
 * Extract clean content from HTML using Readability
 */
function extractContent(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Remove unwanted elements
    const elementsToRemove = [
      '[class*="cookie"]',
      '[id*="cookie"]',
      '[class*="consent"]',
      '[id*="consent"]',
      '[class*="gdpr"]',
      '[id*="gdpr"]',
      '[class*="privacy-popup"]',
      '[class*="privacy-banner"]',
      'script',
      'style',
      'nav',
      '.nav',
      '.navigation',
      'header',
      'footer'
    ];
    
    elementsToRemove.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article || !article.textContent || article.textContent.trim().length < 100) {
      // Fallback to basic text extraction
      const bodyText = document.body.textContent.trim();
      
      // Clean up the text
      const cleanText = bodyText
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();
      
      return cleanText.length > 100 ? cleanText : null;
    }
    
    return article.textContent.trim();
  } catch (err) {
    console.warn('⚠️ Content extraction failed:', err.message);
    return null;
  }
}

/**
 * Filter and prioritize navigation links (same logic as before)
 */
function filterRelevantLinks(links, baseDomain, mainUrl) {
  // Priority keywords for important pages
  const priorityKeywords = [
    'about', 'services', 'products', 'features', 'pricing',
    'solutions', 'contact', 'team', 'company', 'how it works',
    'benefits', 'why', 'what we do', 'offerings'
  ];
  
  // Filter out unwanted links
  const avoidPatterns = [
    /login|signin|signup|register/i,
    /logout|signout/i,
    /privacy|terms|legal|cookie/i,
    /\.pdf$|\.doc$|\.docx$|\.zip$/i,
    /^mailto:|^tel:|^javascript:/i,
    /#$/,
    /facebook\.com|twitter\.com|linkedin\.com|instagram\.com/i
  ];
  
  const scoredLinks = links
    .filter(link => {
      // Must be same domain
      try {
        const linkUrl = new URL(link.url);
        if (linkUrl.origin !== baseDomain) return false;
      } catch {
        return false;
      }
      
      // Avoid unwanted patterns
      if (avoidPatterns.some(pattern => pattern.test(link.url))) {
        return false;
      }
      
      // Don't revisit the main URL
      if (link.url === mainUrl) return false;
      
      return true;
    })
    .map(link => {
      // Score links based on relevance
      let score = 0;
      
      // Prefer navigation links
      if (link.isNavLink) score += 10;
      
      // Check for priority keywords
      const linkText = link.text.toLowerCase();
      const linkUrl = link.url.toLowerCase();
      
      priorityKeywords.forEach(keyword => {
        if (linkText.includes(keyword) || linkUrl.includes(keyword)) {
          score += 5;
        }
      });
      
      // Prefer shorter URLs (likely main sections)
      const pathLength = new URL(link.url).pathname.split('/').filter(p => p).length;
      score += Math.max(0, 5 - pathLength);
      
      return { ...link, score };
    })
    .sort((a, b) => b.score - a.score);
  
  return scoredLinks;
}

module.exports = {
  scrapeWebsiteWithNavigation,
  scrapeWebsite: async (url) => {
    // Backward compatibility - just scrape single page
    const results = await scrapeWebsiteWithNavigation(url, 0);
    return results[0]?.content || '';
  }
};