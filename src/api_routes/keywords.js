const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

// Extract top keywords from recent inbound messages
router.get('/', async (req, res) => {
  try {
    // Get recent inbound messages
    const { data, error } = await supabase
      .from('messages')
      .select('message_body')
      .eq('direction', 'inbound')  // Only inbound messages from leads
      .not('message_body', 'is', null)
      .neq('message_body', '')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .limit(1000);

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Extract and count keywords
    const wordCount = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);

    data.forEach(msg => {
      const words = msg.message_body
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word)); // Filter short words and stop words
      
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    // Get top keywords (minimum 2 occurrences)
    const keywords = Object.entries(wordCount)
      .filter(([word, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    // Fallback to some defaults if no keywords found
    const finalKeywords = keywords.length > 0 ? keywords : ['interested', 'price', 'timeline', 'demo', 'call', 'meeting'];

    res.json({ keywords: finalKeywords });
  } catch (err) {
    console.error('Error extracting keywords:', err);
    res.status(500).json({ error: 'Failed to extract keywords' });
  }
});

module.exports = router;