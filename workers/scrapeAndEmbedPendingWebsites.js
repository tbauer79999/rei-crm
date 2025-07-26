require('dotenv').config();

const supabase = require('../src/lib/supabaseClient.node');
const { scrapeWebsiteWithNavigation } = require('../src/lib/scrapeWebsite');
const fetch = require('node-fetch');

// Enterprise-grade website processor - uses microservices architecture
async function processPendingContent() {
  console.log('🚀 Starting enterprise website processor...');
  
  try {
    // 1. Find all pending websites
    const { data: pendingWebsites, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('source_type', 'website')
      .eq('ingestion_status', 'pending')
      .order('created_at', { ascending: true }); // Process oldest first

    if (error) {
      console.error('❌ Error fetching pending websites:', error);
      return;
    }

    if (!pendingWebsites || pendingWebsites.length === 0) {
      console.log('✅ No pending websites to process');
      return;
    }

    console.log(`📋 Found ${pendingWebsites.length} pending websites to process`);

    // 2. Process each website
    for (const website of pendingWebsites) {
      const { id, website_url, tenant_id, title } = website;
      
      console.log(`\n🌐 Processing website: ${title || website_url}`);
      
      try {
        // Mark as processing to prevent duplicate processing
        const { error: statusError } = await supabase
          .from('knowledge_base')
          .update({ ingestion_status: 'processing' })
          .eq('id', id);

        if (statusError) {
          console.error('❌ Failed to update status to processing:', statusError);
          continue;
        }

        // 3. Scrape the website content
        console.log(`🔍 Starting scrape of: ${website_url}`);
        console.log(`🔍 About to call scrapeWebsiteWithNavigation...`);
        
        const scrapedPages = await scrapeWebsiteWithNavigation(website_url, 5);
        
        console.log(`🔍 Scraping completed, returned:`, {
          pages: scrapedPages?.length || 0,
          firstPageTitle: scrapedPages?.[0]?.title || 'none'
        });
        
        if (!scrapedPages || scrapedPages.length === 0) {
          throw new Error('No content could be scraped from website');
        }

        console.log(`📚 Successfully scraped ${scrapedPages.length} pages`);

        // 4. Combine all scraped content with source attribution
        const combinedContent = scrapedPages
          .map(page => `[Source: ${page.url}]\n\n${page.title}\n\n${page.content}`)
          .join('\n\n---PAGE_BREAK---\n\n');

        console.log(`📝 Combined content length: ${combinedContent.length} characters`);

        // 5. Store scraped content in the database
        const { error: updateError } = await supabase
          .from('knowledge_base')
          .update({
            content: combinedContent,
            metadata: {
              pages_scraped: scrapedPages.length,
              total_content_length: combinedContent.length,
              scraped_at: new Date().toISOString(),
              pages_details: scrapedPages.map(p => ({
                url: p.url,
                title: p.title,
                content_length: p.content.length
              }))
            }
          })
          .eq('id', id);

        if (updateError) {
          throw new Error(`Failed to store scraped content: ${updateError.message}`);
        }

        console.log(`✅ Stored scraped content for ${title || website_url}`);

        // 6. Call the chunk-and-embed edge function (microservice pattern)
        console.log(`🧩 Triggering chunking and embedding via edge function...`);
        
        const chunkResponse = await fetch(
          `${process.env.SUPABASE_URL}/functions/v1/chunk-and-embed`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-database-trigger': 'true',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              document_id: id,
              tenant_id: tenant_id
            })
          }
        );

        if (!chunkResponse.ok) {
          const errorText = await chunkResponse.text();
          throw new Error(`Edge function failed: ${chunkResponse.status} - ${errorText}`);
        }

        const chunkResult = await chunkResponse.json();
        console.log(`✅ Chunking completed: ${chunkResult.chunks_created || 0} chunks created`);

        // 7. Mark as successfully completed
        const { error: completeError } = await supabase
          .from('knowledge_base')
          .update({ 
            ingestion_status: 'complete',
            metadata: {
              ...website.metadata,
              pages_scraped: scrapedPages.length,
              total_chunks: chunkResult.chunks_created || 0,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', id);

        if (completeError) {
          console.error('❌ Failed to mark as complete:', completeError);
        }

        console.log(`🎉 Successfully processed website: ${title || website_url}`);

      } catch (err) {
        console.error(`\n❌ Error processing website ${title || website_url}:`, err.message);
        
        // Mark as failed with error details
        await supabase
          .from('knowledge_base')
          .update({ 
            ingestion_status: 'failed',
            error_message: err.message,
            failed_at: new Date().toISOString()
          })
          .eq('id', id);
      }
    }

    console.log('\n🎉 Website processing completed successfully');
    
  } catch (globalError) {
    console.error('💥 Global error in website processor:', globalError);
  }
}

// Enterprise error handling and execution
console.log('🏁 Starting enterprise website processor execution...');

processPendingContent()
  .then(() => {
    console.log('✅ Website processor completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Website processor execution failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  });