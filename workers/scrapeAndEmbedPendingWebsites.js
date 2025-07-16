require('dotenv').config();

const supabase = require('../src/lib/supabaseClient.node');
const { saveKnowledgeChunks } = require('../src/lib/saveKnowledgeChunks');
const { scrapeWebsiteWithNavigation } = require('../src/lib/scrapeWebsite');
const { createEmbeddingChunks } = require('../supabase/functions/_shared/chunkingService');

// Process all pending content (websites AND PDFs) from the knowledge_base table
async function processPendingContent() {
  const { data: pendingItems, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .in('source_type', ['website', 'pdf'])
    .eq('ingestion_status', 'pending');

  if (error) {
    console.error('❌ Error fetching pending content:', error);
    return;
  }

  console.log(`🔍 Found ${pendingItems.length} pending items to process.`);

  for (const item of pendingItems) {
    const { id, website_url, tenant_id, title, source_type, content } = item;

    try {
      let allChunks = [];

      if (source_type === 'website') {
        console.log(`\n🌐 Processing website: ${website_url}`);
        
        // Scrape main page + up to 5 navigation pages
        const scrapedPages = await scrapeWebsiteWithNavigation(website_url, 5);
        
        console.log(`📚 Scraped ${scrapedPages.length} pages total`);
        
        // Process each page and create chunks
        for (const pageData of scrapedPages) {
          console.log(`\n📄 Processing page: ${pageData.url}`);
          console.log(`   Title: ${pageData.title}`);
          console.log(`   Content length: ${pageData.content.length} characters`);
          
          if (!pageData.content || pageData.content.trim().length < 50) {
            console.warn(`⚠️ Skipping - content too short`);
            continue;
          }
          
          // Create chunks for this page
          const pageChunks = await createEmbeddingChunks({
            content: pageData.content,
            tenantId: tenant_id,
            knowledgeBaseId: id,
            sourceTitle: `${title || website_url} - ${pageData.title}`
          });
          
          console.log(`   ✂️ Created ${pageChunks.length} chunks`);
          
          // Add page URL to chunks for reference
          const chunksWithMetadata = pageChunks.map(chunk => ({
            ...chunk,
            // Adjust chunk_index to be unique across all pages
            chunk_index: allChunks.length + chunk.chunk_index,
            // Optionally store the source URL in chunk_text as metadata
            chunk_text: `[Source: ${pageData.url}]\n\n${chunk.chunk_text}`
          }));
          
          allChunks = allChunks.concat(chunksWithMetadata);
        }

      } else if (source_type === 'pdf') {
        console.log(`\n📄 Processing PDF: ${title || 'Untitled PDF'}`);
        console.log(`   Content length: ${content?.length || 0} characters`);
        
        if (!content || content.trim().length < 50) {
          throw new Error('PDF content is too short or empty');
        }
        
        // Create chunks for the PDF content
        const pdfChunks = await createEmbeddingChunks({
          content: content,
          tenantId: tenant_id,
          knowledgeBaseId: id,
          sourceTitle: title || 'PDF Document'
        });
        
        console.log(`   ✂️ Created ${pdfChunks.length} chunks for PDF`);
        
        allChunks = pdfChunks;
      }
      
      console.log(`\n📊 Total chunks created: ${allChunks.length}`);
      
      if (allChunks.length > 0) {
        // Save all chunks in batch
        await saveKnowledgeChunks({
          supabase,
          chunks: allChunks
        });
        
        // Update status to complete
        const { data: updateData, error: updateError } = await supabase
          .from('knowledge_base')
          .update({ 
            ingestion_status: 'complete'
          })
          .eq('id', id);
        
        if (updateError) {
          console.error('❌ Error updating status:', updateError);
        }
        
        console.log(`✅ Successfully processed ${source_type}: ${title || website_url}`);
      } else {
        throw new Error(`No content could be extracted from ${source_type}`);
      }
      
    } catch (err) {
      console.error(`\n❌ Error processing ${source_type} (${title || website_url}):`, err.message);
      console.error('📍 Full error:', err);
      
      await supabase
        .from('knowledge_base')
        .update({ 
          ingestion_status: 'failed',
          error_message: err.message 
        })
        .eq('id', id);
    }
  }

  console.log('\n🎉 All pending content processed.');
}

// Run the job
processPendingContent();