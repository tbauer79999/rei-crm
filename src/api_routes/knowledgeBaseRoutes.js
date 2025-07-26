// src/api_routes/knowledgeBaseRoutes.js
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fetch = require('node-fetch');
const { supabase } = require('../lib/supabaseService');
const { fetchRecordById, fetchAllRecords, fetchSettingValue } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

const router = express.Router();
const upload = multer();

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// POST /api/knowledge/upload
router.post('/upload', async (req, res) => {
  try {
    const { title = '', description = '', file_url, file_name } = req.body;
    const { role, tenant_id } = req.user || {};

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    if (!file_url || !file_name) {
      return res.status(400).json({ error: 'Missing file_url or file_name' });
    }

    const response = await fetch(file_url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdf(buffer);
    
    // DEBUG: Log what we're getting from PDF
    console.log('PDF data type:', typeof data?.text);
    console.log('PDF data length:', data?.text?.length);
    console.log('PDF data first 100 chars:', data?.text?.substring(0, 100));
    
    // Force it to be a clean string
    let extractedText = '';
    if (data?.text && typeof data.text === 'string') {
      extractedText = data.text.trim().slice(0, 100000);
    }
    
    console.log('Final extracted text length:', extractedText.length);
    console.log('Final extracted text type:', typeof extractedText);

    const insertData = {
      title: title || '',
      description: description || '',
      file_url,
      file_name,
      content: extractedText || null
    };

    // Add tenant_id unless global admin (global admin creates global knowledge)
    if (role !== 'global_admin') {
      insertData.tenant_id = tenant_id;
    }

    console.log('Insert data:', JSON.stringify(insertData, null, 2));

    const { data: inserted, error } = await supabase
      .from('knowledge_base')
      .insert([insertData])
      .select();

    // Trigger the edge function manually
    if (inserted?.[0]?.id) {
      const edgeResponse = await fetch(
        'https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/chunk-and-embed',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-database-trigger': 'true',
            'Authorization': req.headers.authorization // ✅ use token passed from frontend
          },
          body: JSON.stringify({
            document_id: inserted[0].id,
            tenant_id: inserted[0].tenant_id || tenant_id
          })
        }
      );

      // Optional: log or check edgeResponse if needed
      const result = await edgeResponse.json();
      console.log('Edge function response:', result);

      if (!edgeResponse.ok) {
        const errText = await edgeResponse.text();
        console.error('Edge function failed:', edgeResponse.status, errText);
      } else {
        console.log('Edge function triggered successfully.');
      }
    } else {
      console.warn('Upload succeeded but no document ID returned.');
    }

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    res.status(200).json({ 
      success: true, 
      record: inserted?.[0],
      meta: { role, tenant_id }
    });
  } catch (err) {
    console.error('Supabase upload failed:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Failed to upload knowledge file' });
  }
});

// GET /api/knowledge/docs
router.get('/docs', async (req, res) => {
  try {
    const { role, tenant_id } = req.user || {};

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('knowledge_base')
      .select('id, title, file_name, file_url, created_at, tenant_id')
      .order('created_at', { ascending: false });

    // Apply tenant filtering
    if (role === 'global_admin') {
      // Global admin sees all knowledge base documents
    } else if (role === 'enterprise_admin' || role === 'business_admin' || role === 'user') {
      // Filter to tenant-specific docs + global docs (where tenant_id is null)
      query = query.or(`tenant_id.eq.${tenant_id},tenant_id.is.null`);
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data, error } = await query;

    if (error) throw error;

    // FIX: Return data properly without spreading
    res.status(200).json({
      data: data,  // ← Changed from ...data to data: data
      meta: { role, tenant_id, document_count: data?.length || 0 }
    });
  } catch (err) {
    console.error('Error fetching knowledge docs:', err.message);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/knowledge/docs/:id
router.get('/docs/:id', async (req, res) => {
 const { id } = req.params;
 const { role, tenant_id } = req.user || {};
 
 try {
   // Security check
   if (!tenant_id && role !== 'global_admin') {
     return res.status(403).json({ error: 'No tenant access configured' });
   }

   // Build query with security filter
   let query = supabase
     .from('knowledge_base')
     .select('*')
     .eq('id', id);

   // Apply tenant filtering
   if (role === 'global_admin') {
     // Global admin can access any document
   } else if (role === 'enterprise_admin' || role === 'business_admin' || role === 'user') {
     // Can only access their tenant's docs or global docs
     query = query.or(`tenant_id.eq.${tenant_id},tenant_id.is.null`);
   } else {
     return res.status(403).json({ error: 'Insufficient permissions' });
   }

   const { data: record, error } = await query.single();

   if (error) {
     if (error.code === 'PGRST116') {
       return res.status(404).json({ error: 'Document not found or access denied' });
     }
     throw error;
   }
   
   res.status(200).json({
     ...record,
     meta: { role, tenant_id }
   });
 } catch (err) {
   console.error('Error fetching document by ID:', err.message);
   res.status(500).json({ error: 'Failed to fetch document' });
 }
});

// DELETE /api/knowledge/docs/:id
router.delete('/docs/:id', async (req, res) => {
  const { id } = req.params;
  const { role, tenant_id } = req.user || {};
  
  console.log('🗑️ DELETE called for knowledge_base ID:', id);
  console.log('User role:', role, 'Tenant ID:', tenant_id);

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // First, check if the document exists and user has permission
    let checkQuery = supabase
      .from('knowledge_base')
      .select('id, tenant_id')
      .eq('id', id);

    // Apply tenant filtering for permission check
    if (role === 'global_admin') {
      // Global admin can delete any document
    } else if (role === 'enterprise_admin' || role === 'business_admin' || role === 'user') {
      // Can only delete their tenant's docs or global docs
      checkQuery = checkQuery.or(`tenant_id.eq.${tenant_id},tenant_id.is.null`);
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data: checkResult, error: checkError } = await checkQuery.single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Document not found or access denied' });
      }
      throw checkError;
    }

// First delete any campaign links to avoid foreign key constraint
console.log('🔗 Checking for campaign links for knowledge_id:', id);

const { data: linkData, error: linkError } = await supabase
  .from('campaign_knowledge_links')
  .delete()
  .eq('knowledge_id', id)
  .select(); // Add select to see what was deleted

console.log('🔗 Campaign links delete result:', { linkData, linkError });

if (linkError) {
  console.warn('⚠️ Error deleting campaign links:', linkError.message);
  // Continue anyway - links might not exist
}

// Now delete the document
console.log('📄 Deleting knowledge base entry:', id);
const { data, error } = await supabase
  .from('knowledge_base')
  .delete()
  .eq('id', id)
  .select(); // Return deleted record

    if (error) {
      console.error('❌ Supabase delete error:', error.message);
      return res.status(500).json({ error: 'Supabase delete failed' });
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No matching document deleted. ID may not exist:', id);
      return res.status(404).json({ error: 'Document not found' });
    } else {
      console.log('✅ Deleted document:', data[0]);
    }

    res.status(200).json({ 
      success: true,
      meta: { role, tenant_id, deleted_id: id }
    });
  } catch (err) {
    console.error('🚨 Server crash in DELETE:', err.message);
    res.status(500).json({ error: 'Internal server error deleting document' });
  }
});

// GET /api/knowledge/bundle
const { generateKnowledgeBundleString } = require('../lib/knowledgeService');

router.get('/bundle', async (req, res) => {
  try {
    const { role, tenant_id } = req.user || {};

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Generate bundle based on user's access level
    // This function might need to be updated to handle tenant filtering
    const bundleString = await generateKnowledgeBundleString(tenant_id, role);
    
    res.status(200).json({ 
      bundle: bundleString,
      meta: { role, tenant_id }
    });
  } catch (err) {
    console.error('Knowledge bundle error:', err.message);
    res.status(500).json({ error: 'Failed to generate knowledge bundle' });
  }
});

module.exports = router;