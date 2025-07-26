const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { URL } = require('url');

/**
 * Scrape a website and its navigation pages dynamically
 * @param {string} mainUrl - The main website URL
 * @param {number} maxPages - Maximum number of navigation pages to scrape (default 5)
 * @returns {Promise<Array<{url: string, title: string, content: string}>>}
 */
async function scrapeWebsiteWithNavigation(mainUrl, maxPages = 5) {
const browser = await puppeteer.launch({ 
  headless: 'new',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/render/.cache/puppeteer/chrome/linux-138.0.7204.49/chrome-linux64/chrome',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process', // Important for Render
    '--disable-gpu'
  ]
});
  
  const scrapedPages = [];
  const visitedUrls = new Set();
  
  try {
    // Parse the main URL to get the domain
    const mainUrlObj = new URL(mainUrl);
    const baseDomain = mainUrlObj.origin;
    
    console.log(`🏠 Starting with main URL: ${mainUrl}`);
    
    // Step 1: Scrape the main page and get navigation links
    const mainPage = await browser.newPage();
    
    // Set viewport and user agent to appear more like a real browser
    await mainPage.setViewport({ width: 1920, height: 1080 });
    await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await mainPage.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Handle cookie consent popups
    await handleCookieConsent(mainPage);
    
    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the main page content
    const mainHtml = await mainPage.content();
    const mainContent = extractContent(mainHtml, mainUrl);
    
    if (mainContent) {
      scrapedPages.push({
        url: mainUrl,
        title: await mainPage.title() || 'Home',
        content: mainContent
      });
      visitedUrls.add(mainUrl);
    }
    
    // Find navigation links (common patterns for nav links)
    const navLinks = await mainPage.evaluate(() => {
      const links = [];
      
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
      
      const foundLinks = new Set();
      
      navSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(link => {
          const href = link.href;
          const text = link.textContent.trim();
          
          if (href && !foundLinks.has(href)) {
            foundLinks.add(href);
            links.push({
              url: href,
              text: text,
              isNavLink: true
            });
          }
        });
      });
      
      // Strategy 2: If no nav found, get prominent links from header/top of page
      if (links.length === 0) {
        // Get links from the top portion of the page
        const allLinks = document.querySelectorAll('a');
        const viewportHeight = window.innerHeight;
        
        allLinks.forEach(link => {
          const rect = link.getBoundingClientRect();
          const href = link.href;
          const text = link.textContent.trim();
          
          // Get links in the top 25% of the viewport (likely navigation)
          if (rect.top < viewportHeight * 0.25 && href && !foundLinks.has(href)) {
            foundLinks.add(href);
            links.push({
              url: href,
              text: text,
              isNavLink: false
            });
          }
        });
      }
      
      return links;
    });
    
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
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await page.goto(linkInfo.url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Handle cookie consent on each page
        await handleCookieConsent(page);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const html = await page.content();
        const content = extractContent(html, linkInfo.url);
        
        if (content && content.length > 100) {
          scrapedPages.push({
            url: linkInfo.url,
            title: await page.title() || linkInfo.text || 'Page',
            content: content
          });
          visitedUrls.add(linkInfo.url);
        }
        
        await page.close();
        
        // Add a small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.warn(`⚠️ Failed to scrape ${linkInfo.url}:`, err.message);
      }
    }
    
  } finally {
    await browser.close();
  }
  
  console.log(`✅ Successfully scraped ${scrapedPages.length} pages`);
  return scrapedPages;
}

/**
 * Handle common cookie consent popups
 */
async function handleCookieConsent(page) {
  try {
    // Common cookie consent button selectors
    const consentSelectors = [
      // Generic patterns
      '[id*="accept-cookie"]',
      '[class*="accept-cookie"]',
      '[id*="cookie-accept"]',
      '[class*="cookie-accept"]',
      'button[aria-label*="accept cookie"]',
      'button[aria-label*="accept all"]',
      
      // Common text patterns
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button:has-text("Accept cookies")',
      'button:has-text("I agree")',
      'button:has-text("Got it")',
      'button:has-text("OK")',
      'button:has-text("Agree")',
      
      // Common cookie banner services
      '.cc-compliance .cc-btn',
      '#onetrust-accept-btn-handler',
      '.cookie-notice button.accept',
      '.gdpr-cookie-notice button.accept',
      '#cookieConsent button.allow',
      '.cookie-banner button.accept',
      
      // More specific selectors for common implementations
      '[data-testid="cookie-accept"]',
      '[data-qa="cookie-accept"]',
      '.CookieConsent__Button',
      '.js-cookie-consent-accept'
    ];
    
    // Try each selector
    for (const selector of consentSelectors) {
      try {
        // Check if element exists and is visible
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            console.log(`🍪 Found cookie consent button: ${selector}`);
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for animation
            return;
          }
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    // Also try to remove cookie overlays by hiding them
    await page.evaluate(() => {
      // Common cookie overlay patterns
      const overlaySelectors = [
        '[class*="cookie-banner"]',
        '[class*="cookie-popup"]',
        '[class*="cookie-consent"]',
        '[class*="cookie-notice"]',
        '[id*="cookie-banner"]',
        '[id*="cookie-popup"]',
        '[id*="cookie-consent"]',
        '[id*="cookie-notice"]',
        '.gdpr-overlay',
        '#gdpr-consent',
        '.cc-window'
      ];
      
      overlaySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el && el.style) {
            el.style.display = 'none';
          }
        });
      });
    });
    
  } catch (err) {
    console.log('🍪 Cookie handling attempt finished');
  }
}

/**
 * Extract clean content from HTML using Readability
 */
function extractContent(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Remove cookie consent elements before processing
    const elementsToRemove = [
      '[class*="cookie"]',
      '[id*="cookie"]',
      '[class*="consent"]',
      '[id*="consent"]',
      '[class*="gdpr"]',
      '[id*="gdpr"]',
      '[class*="privacy-popup"]',
      '[class*="privacy-banner"]'
    ];
    
    elementsToRemove.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article || !article.textContent || article.textContent.trim().length < 100) {
      // Fallback to basic text extraction
      const bodyText = document.body.textContent.trim();
      
      // Filter out privacy/cookie text
      const lines = bodyText.split('\n')
        .filter(line => {
          const lower = line.toLowerCase();
          return !lower.includes('cookie') || 
                 !lower.includes('privacy policy') ||
                 !lower.includes('opt-out') ||
                 !lower.includes('advertising partners');
        })
        .join('\n');
      
      return lines;
    }
    
    return article.textContent.trim();
  } catch (err) {
    console.warn('⚠️ Content extraction failed:', err.message);
    return null;
  }
}

/**
 * Filter and prioritize navigation links
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