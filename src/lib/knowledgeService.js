// src/lib/knowledgeService.js
const { supabase } = require('../../server'); // Import backend Supabase client from server.js

/**
 * Fetches knowledge base documents from Supabase and formats them into a single string.
 * @returns {Promise<string>} A promise that resolves to the knowledge bundle string.
 */
export const generateKnowledgeBundleString = async () => {
  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge base for bundle:', error.message);
      throw new Error('Failed to fetch knowledge base for bundle: ' + error.message);
    }

    if (!data) {
      return ''; // Return empty string if no data
    }

    const bundle = data
      .map((doc) => `📄 ${doc.title || 'Untitled'}\n\n${doc.content || ''}`)
      .join('\n\n');

    return bundle;
  } catch (err) {
    // Log the error and rethrow or handle as appropriate for your application
    console.error('Error in generateKnowledgeBundleString:', err.message);
    // Depending on how you want to handle errors, you might rethrow,
    // or return a specific error indicator or an empty string.
    // For now, rethrowing to make it visible to the caller.
    throw err; 
  }
};
