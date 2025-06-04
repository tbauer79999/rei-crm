// src/api_routes/companyResearchRoutes.js
const express = require('express');
const router = express.Router();

console.log('🔑 Loading OpenAI key:', process.env.OPENAI_API_KEY ? 'Found' : 'NOT FOUND');
console.log('🔑 Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 7));

// Research company endpoint
router.post('/', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain } = req.body;
  
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    console.log(`🚀 Starting research for domain: ${domain}`);
    
    // Skip personal email domains
    if (isPersonalEmailDomain(domain)) {
      console.log(`⏭️ Skipping personal email domain: ${domain}`);
      return res.status(200).json({
        domain,
        companyName: generateCompanyNameFromDomain(domain),
        description: `A professional company operating at ${domain}`,
        insights: ['We found your company domain and pre-filled some basic information!']
      });
    }
    
    // ALWAYS try to scrape the actual website (no hardcoded shortcuts)
    const companyData = await scrapeCompanyWebsite(domain);
    
    // If scraping failed, create a generic response
    if (!companyData) {
      console.log(`❌ Could not analyze ${domain}, using fallback`);
      return res.status(200).json({
        domain,
        companyName: generateCompanyNameFromDomain(domain),
        description: `A professional company operating at ${domain}`,
        insights: ['We found your company domain and pre-filled some basic information!']
      });
    }
    
    console.log(`✅ Successfully analyzed ${domain}`);
    res.status(200).json(companyData);
    
  } catch (error) {
    console.error('💥 Company research error:', error);
    res.status(500).json({ error: 'Research failed' });
  }
});

// Check if domain is a personal email provider
function isPersonalEmailDomain(domain) {
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
  return personalDomains.includes(domain.toLowerCase());
}

// Scrape company website - OPTIMIZED VERSION
async function scrapeCompanyWebsite(domain) {
  try {
    console.log(`🌐 Scraping website: ${domain}`);
    
    // Collect ALL content first, then make ONE API call
    const allContent = await gatherAllWebsiteContent(domain);
    
    if (allContent.length === 0) {
      console.log('❌ No content found for analysis');
      return null;
    }
    
    // Make SINGLE API call with all collected content
    const aiInsights = await analyzeAllContentWithAI(allContent, domain);
    
    if (aiInsights) {
      console.log(`✅ AI analysis successful for: ${domain}`);
      return {
        domain,
        companyName: aiInsights.companyName || generateCompanyNameFromDomain(domain),
        description: aiInsights.description || `${aiInsights.companyName || generateCompanyNameFromDomain(domain)} - innovative business solutions`,
        insights: aiInsights.insights || [`We analyzed ${domain} and found some interesting insights about your business!`],
        aiGenerated: true
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('🚨 Website scraping failed:', error);
    return null;
  }
}

// Gather all content from multiple pages, then analyze once
async function gatherAllWebsiteContent(domain) {
  const urlsToTry = [
    `https://${domain}`,
    `https://www.${domain}`,
    `https://${domain}/about`,
    `https://www.${domain}/about`
  ];
  
  const allContent = [];
  
  for (const url of urlsToTry) {
    try {
      console.log(`📡 Trying: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 8000
      });
      
      if (!response.ok) {
        console.log(`❌ ${url} failed: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      console.log(`📄 Retrieved ${html.length} characters from ${url}`);
      
      // Extract and clean content
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length > 100) {
        allContent.push({
          url,
          content: cleanText.substring(0, 2000), // Limit each page
          basicInfo: extractBasicInfoFromHTML(html, domain)
        });
        console.log(`✅ Content collected from: ${url} (${cleanText.length} chars)`);
      } else {
        console.log(`⚠️ Content too short from ${url}: ${cleanText.length} chars`);
      }
      
    } catch (error) {
      console.log(`⚠️ Error with ${url}:`, error.message);
      continue;
    }
  }
  
  console.log(`📊 Total content sources collected: ${allContent.length}`);
  return allContent;
}

// Analyze ALL content in a single API call
async function analyzeAllContentWithAI(allContent, domain) {
  try {
    console.log(`🧠 Starting SINGLE AI analysis for ${domain} with ${allContent.length} pages`);
    
    if (allContent.length === 0) {
      console.log('❌ No content to analyze');
      return null;
    }
    
    // Combine all content into one comprehensive prompt
    let combinedContent = '';
    let basicInfo = {};
    
    allContent.forEach((item, index) => {
      combinedContent += `\n\n--- Page ${index + 1} (${item.url}) ---\n${item.content}`;
      
      // Use the first page's basic info
      if (index === 0) {
        basicInfo = item.basicInfo;
      }
    });
    
    // Limit total content size for API
    if (combinedContent.length > 8000) {
      combinedContent = combinedContent.substring(0, 8000) + '...[content truncated]';
    }
    
    console.log(`🔤 Sending ${combinedContent.length} characters to OpenAI for analysis`);
    
    const prompt = `Analyze this company's website content from multiple pages and provide insights for a CRM onboarding experience.

Company Domain: ${domain}

Website Content from ${allContent.length} pages:
${combinedContent}

Please provide a JSON response with:
1. companyName: Clean, proper company name (from the content above)
2. description: 1-2 sentence description of what they do (professional but engaging)
3. insights: Array of 1-2 personalized insights that show we researched them (be specific about their business, mention actual services/achievements/unique aspects you found)

Requirements:
- Be specific and personalized (mention actual things from their website)
- Sound warm and professional, not robotic
- Focus on business value and what makes them unique
- Keep insights to 1-2 sentences each
- Don't use generic phrases like "professional company"
- If you find specific achievements, services, or unique aspects, mention them

Example good insight: "Love seeing your focus on reducing client acquisition costs by 40% - that ROI mindset is exactly what we're about!"
Example bad insight: "Great to see your professional approach to business!"

Return only valid JSON.`;

    // Make SINGLE API call
    console.log('🚀 Making OpenAI API call...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    console.log(`📡 OpenAI API response status: ${openaiResponse.status}`);

    if (!openaiResponse.ok) {
      console.error('🚨 OpenAI API error:', openaiResponse.status);
      const errorText = await openaiResponse.text();
      console.error('🚨 Error details:', errorText);
      return null;
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices[0].message.content;
    
    console.log('🤖 Raw AI response received');
    console.log('🤖 Response content:', aiContent);
    
    // Parse the JSON response
    try {
      let cleanedResponse = aiContent.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      const parsedResponse = JSON.parse(cleanedResponse);
      console.log('✅ AI analysis complete:', parsedResponse);
      return parsedResponse;
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.error('Raw content:', aiContent);
      return null;
    }
    
  } catch (error) {
    console.error('💥 AI analysis failed:', error);
    return null;
  }
}

// Extract basic info from HTML (fallback)
function extractBasicInfoFromHTML(html, domain) {
  const result = {
    companyName: '',
    description: ''
  };
  
  // Extract company name from title tag or h1
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    title = title.replace(/\s*[-|].*$/, '').trim();
    if (title.length > 2 && title.length < 50 && !title.toLowerCase().includes('home')) {
      result.companyName = title;
    }
  }
  
  // Also try h1 for company name
  if (!result.companyName) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      let h1Text = h1Match[1].replace(/<[^>]*>/g, '').trim();
      if (h1Text.length > 2 && h1Text.length < 50) {
        result.companyName = h1Text;
      }
    }
  }
  
  // Extract description from meta description
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (metaDescMatch) {
    result.description = metaDescMatch[1].trim();
  }
  
  return result;
}

// Helper function to generate company name from domain
function generateCompanyNameFromDomain(domain) {
  let name = domain
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|inc|llc)$/, '');
  
  name = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return name;
}

module.exports = router;