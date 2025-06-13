const { supabase } = require('./supabaseService');

const generateKnowledgeBundleString = async (tenant_id = null, role = null) => {
  try {
    // Build query based on tenant and role
    let query = supabase
      .from('knowledge_base')
      .select('title, content')
      .order('created_at', { ascending: false });

    // Apply tenant filtering based on role
    if (role === 'global_admin') {
      // Global admin sees all knowledge base documents
    } else if (role === 'enterprise_admin' || role === 'business_admin') {
      // Filter to tenant-specific docs + global docs (where tenant_id is null)
      if (tenant_id) {
        query = query.or(`tenant_id.eq.${tenant_id},tenant_id.is.null`);
      }
    } else if (tenant_id) {
      // Regular users only see their tenant's docs
      query = query.eq('tenant_id', tenant_id);
    } else {
      // No tenant specified, return empty
      return '';
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching knowledge base for bundle:', error.message);
      throw new Error('Failed to fetch knowledge base: ' + error.message);
    }

    if (!data || data.length === 0) {
      console.log('No knowledge base documents found for tenant:', tenant_id);
      return '';
    }

    const bundle = data
      .map(doc => `📄 ${doc.title || 'Untitled'}\n\n${doc.content || ''}`)
      .join('\n\n');

    console.log(`Generated knowledge bundle for tenant ${tenant_id} with ${data.length} documents`);
    return bundle;
  } catch (err) {
    console.error('Error in generateKnowledgeBundleString:', err.message);
    throw err;
  }
};

module.exports = { generateKnowledgeBundleString };