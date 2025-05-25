const { supabase } = require('./supabaseService');



const generateKnowledgeBundleString = async () => {
  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge base for bundle:', error.message);
      throw new Error('Failed to fetch knowledge base: ' + error.message);
    }

    if (!data) return '';

    const bundle = data
      .map(doc => `📄 ${doc.title || 'Untitled'}\n\n${doc.content || ''}`)
      .join('\n\n');

    return bundle;
  } catch (err) {
    console.error('Error in generateKnowledgeBundleString:', err.message);
    throw err;
  }
};

module.exports = { generateKnowledgeBundleString };
