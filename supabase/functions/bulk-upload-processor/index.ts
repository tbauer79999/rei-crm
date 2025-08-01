// =====================================================
// Bulk Upload Processor Edge Function
// File: supabase/functions/bulk-upload-processor/index.ts
// =====================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

// Helper function to parse CSV from URL
async function parseCSVFromURL(fileUrl) {
  try {
    console.log('📥 Downloading CSV from:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.statusText}`);
    }
    const csvText = await response.text();
    console.log('📄 CSV downloaded, size:', csvText.length, 'characters');
    // Simple CSV parser (you might want to use a more robust one)
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map((h)=>h.trim().replace(/"/g, ''));
    const records = [];
    for(let i = 1; i < lines.length; i++){
      const values = lines[i].split(',').map((v)=>v.trim().replace(/"/g, ''));
      const record = {};
      headers.forEach((header, index)=>{
        record[header] = values[index] || '';
      });
      records.push(record);
    }
    console.log(`✅ Parsed ${records.length} records from CSV`);
    return records;
  } catch (error) {
    console.error('❌ Error parsing CSV:', error);
    throw error;
  }
}

// Get tenant's lead field configuration
async function getTenantFieldConfig(tenantId) {
  // Step 1: Get tenant's industry_id
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('industry_id')
    .eq('id', tenantId)
    .single();
    
  if (tenantError || !tenant?.industry_id) {
    console.error('Error fetching tenant or no industry_id:', tenantError);
    return [];
  }

  // Step 2: Get industry field templates using industry_id
  const { data, error } = await supabase
    .from('industry_field_templates')
    .select('*')
    .eq('industry_id', tenant.industry_id)
    .order('display_order');
    
  if (error) {
    console.error('Error fetching field config:', error);
    return [];
  }

  // Remove duplicates by field_name
  const uniqueFields = data?.reduce((acc, field) => {
    const exists = acc.find((f) => f.field_name === field.field_name);
    if (!exists) {
      acc.push(field);
    }
    return acc;
  }, []) || [];
  
  console.log(`📋 Loaded ${uniqueFields.length} unique field configurations`);
  return uniqueFields;
}

// Get existing leads for deduplication
async function getExistingLeads(tenantId, dedupeFields) {
  const { data, error } = await supabase.from('leads').select(dedupeFields.join(', ')).eq('tenant_id', tenantId);
  if (error) {
    console.error('Error fetching existing leads:', error);
    return new Set();
  }
  // Create deduplication keys
  const existingKeys = new Set();
  data?.forEach((lead)=>{
    const key = dedupeFields.map((field)=>lead[field]?.toLowerCase()?.trim() || '').filter((v)=>v).join('|');
    if (key) existingKeys.add(key);
  });
  console.log(`🔍 Found ${existingKeys.size} existing leads for deduplication`);
  return existingKeys;
}

// Validate and process a chunk of records
async function processChunk(records, fieldConfig, existingKeys, tenantId, campaignId, fieldMapping) {
  const result = {
    successful: 0,
    failed: 0,
    duplicates: 0,
    errors: []
  };
  // Get required fields
  const requiredFields = fieldConfig.filter((f)=>f.is_required).map((f)=>f.field_name);
  // Set deduplication fields - hardcoded for now since is_unique column doesn't exist
  const dedupeFields = [
    'name',
    'phone',
    'email'
  ].filter((fieldName)=>fieldConfig.some((f)=>f.field_name === fieldName));
  if (dedupeFields.length === 0) {
    dedupeFields.push('name'); // Default dedupe field
  }
  console.log('📝 Processing with required fields:', requiredFields);
  console.log('🔍 Deduplication fields:', dedupeFields);
  const validRecords = [];
  // Validate each record
  records.forEach((record, index)=>{
  const rowNumber = index + 1;
  
  // Core fields that have actual columns in the leads table
  const coreFields = ['name', 'phone', 'email', 'status', 'tenant_id', 'campaign_id', 'created_at', 'status_history'];
  
  // Map CSV fields to database fields
  const mappedRecord = {
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    custom_fields: {} // Store dynamic fields here
  };
  
  // Field mapping and validation
  let hasErrors = false;
  
  // Handle field mapping - separate core fields from custom fields
  Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
    const value = record[csvColumn] || '';
    
    if (coreFields.includes(dbField)) {
      // Store in actual column
      mappedRecord[dbField] = value;
    } else {
      // Store in JSON column
      mappedRecord.custom_fields[dbField] = value;
    }
  });
    
    // Check required fields
    fieldConfig.forEach((field) => {
      if (field.is_required && (!mappedRecord[field.field_name] || mappedRecord[field.field_name].trim() === '')) {
        result.errors.push({
          row_number: rowNumber,
          data: record,
          error_type: 'validation',
          error_message: `Required field '${field.field_label}' is empty`,
          error_field: field.field_name
        });
        hasErrors = true;
      }
    });

    // Add campaign if provided
    if (campaignId) {
      mappedRecord.campaign_id = campaignId;
    }
    // Add default status and history
    if (!mappedRecord.status) {
      mappedRecord.status = 'Cold Lead';
    }
    const today = new Date().toISOString().split('T')[0];
    mappedRecord.status_history = `${today}: ${mappedRecord.status}`;
    if (hasErrors) {
      result.failed++;
      return;
    }
    // Check for duplicates
    const dedupeKey = dedupeFields.map((field)=>mappedRecord[field]?.toLowerCase()?.trim() || '').filter((v)=>v).join('|');
    // Debug logging
    console.log(`🔍 Row ${rowNumber}:`);
    console.log(`  - Name: "${mappedRecord.name}"`);
    console.log(`  - Phone: "${mappedRecord.phone}"`);
    console.log(`  - Email: "${mappedRecord.email}"`);
    console.log(`  - DedupeKey: "${dedupeKey}"`);
    console.log(`  - ExistingKeys size: ${existingKeys.size}`);
    console.log(`  - Is duplicate: ${existingKeys.has(dedupeKey)}`);
    if (dedupeKey && existingKeys.has(dedupeKey)) {
      result.duplicates++;
      result.errors.push({
        row_number: rowNumber,
        data: record,
        error_type: 'duplicate',
        error_message: `Duplicate record detected (${dedupeFields.join(', ')})`
      });
      return;
    }
    // Add to existing keys to prevent duplicates within this chunk
    if (dedupeKey) {
      existingKeys.add(dedupeKey);
    }
    validRecords.push(mappedRecord);
  });
  // Bulk insert valid records
  if (validRecords.length > 0) {
    console.log(`💾 Inserting ${validRecords.length} valid records`);
    const { error: insertError } = await supabase.from('leads').insert(validRecords);
    if (insertError) {
      console.error('❌ Bulk insert error:', insertError);
      // Mark all as failed if bulk insert fails
      validRecords.forEach((record, index)=>{
        result.errors.push({
          row_number: index + 1,
          data: record,
          error_type: 'database',
          error_message: insertError.message
        });
      });
      result.failed += validRecords.length;
    } else {
      result.successful = validRecords.length;
      console.log(`✅ Successfully inserted ${validRecords.length} records`);
    }
  }
  return result;
}

// Update job progress in database
async function updateJobProgress(jobId, chunkNumber, chunkResult, totalProcessed, totalRecords) {
  try {
    // Validate jobId
    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      throw new Error('Invalid jobId provided to updateJobProgress');
    }
    // Get current job totals first
    const { data: currentJob } = await supabase.from('bulk_upload_jobs').select('successful_records, failed_records, duplicate_records').eq('id', jobId).single();
    // Update main job progress
    const { error: jobError } = await supabase.from('bulk_upload_jobs').update({
      processed_records: totalProcessed,
      successful_records: (currentJob?.successful_records || 0) + chunkResult.successful,
      failed_records: (currentJob?.failed_records || 0) + chunkResult.failed,
      duplicate_records: (currentJob?.duplicate_records || 0) + chunkResult.duplicates,
      current_chunk: chunkNumber
    }).eq('id', jobId);
    if (jobError) {
      console.error('❌ Error updating job progress:', jobError);
    }
    // Update chunk status
    const { error: chunkError } = await supabase.from('bulk_upload_chunks').update({
      status: 'completed',
      records_processed: chunkResult.successful + chunkResult.failed + chunkResult.duplicates,
      records_successful: chunkResult.successful,
      records_failed: chunkResult.failed + chunkResult.duplicates,
      completed_at: new Date().toISOString()
    }).eq('job_id', jobId).eq('chunk_number', chunkNumber);
    if (chunkError) {
      console.error('❌ Error updating chunk status:', chunkError);
    }
    // Log errors if any
    if (chunkResult.errors.length > 0) {
      const errorRecords = chunkResult.errors.map((error)=>({
          job_id: jobId,
          row_number: error.row_number,
          raw_data: error.data,
          error_type: error.error_type,
          error_message: error.error_message,
          error_field: error.error_field
        }));
      const { error: errorInsertError } = await supabase.from('bulk_upload_errors').insert(errorRecords);
      if (errorInsertError) {
        console.error('❌ Error logging chunk errors:', errorInsertError);
      }
    }
  } catch (error) {
    console.error('❌ Error in updateJobProgress:', error);
  }
}

// Complete job processing
async function completeJob(jobId, status, errorMessage) {
  try {
    // Validate jobId
    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      throw new Error('Invalid jobId provided to completeJob');
    }
    const updateData = {
      status,
      completed_at: new Date().toISOString()
    };
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    // Calculate processing time and performance metrics
    const { data: job } = await supabase.from('bulk_upload_jobs').select('started_at, successful_records').eq('id', jobId).single();
    if (job?.started_at) {
      const processingTimeSeconds = Math.floor((new Date().getTime() - new Date(job.started_at).getTime()) / 1000);
      updateData.processing_time_seconds = processingTimeSeconds;
      if (processingTimeSeconds > 0 && job.successful_records > 0) {
        updateData.average_records_per_minute = Math.round(job.successful_records / processingTimeSeconds * 60);
      }
    }
    const { error } = await supabase.from('bulk_upload_jobs').update(updateData).eq('id', jobId);
    if (error) {
      console.error('❌ Error completing job:', error);
    }
    // Remove from processing queue
    await supabase.from('job_processing_queue').delete().eq('job_id', jobId);
    console.log(`🏁 Job ${jobId} completed with status: ${status}`);
  } catch (error) {
    console.error('❌ Error in completeJob:', error);
  }
}

// Main job processor
async function processJob(jobId, jobData) {
  try {
    // Validate jobId first
    if (!jobId || jobId === 'undefined' || jobId === 'null') {
      throw new Error('Invalid jobId provided to processJob');
    }
    console.log(`🚀 Starting job ${jobId}`);
    console.log('📋 Job data:', JSON.stringify(jobData, null, 2));
    // Extract job properties - handle different possible structures
    const tenantId = jobData.tenant_id;
    const fileUrl = jobData.file_url;
    const campaignId = jobData.campaign_id;
    const chunkSize = jobData.chunk_size || 1000;
    const fieldMapping = jobData.field_mapping || {};
    if (!tenantId || !fileUrl) {
      throw new Error('Missing required job data: tenant_id or file_url');
    }
    console.log(`🚀 Processing job ${jobId} for tenant ${tenantId}`);
    // Step 1: Parse CSV
    const records = await parseCSVFromURL(fileUrl);
    if (records.length === 0) {
      await completeJob(jobId, 'failed', 'No records found in CSV file');
      return;
    }
    // Update total records if not set
    await supabase.from('bulk_upload_jobs').update({
      total_records: records.length
    }).eq('id', jobId);
    // Step 2: Get field configuration
    const fieldConfig = await getTenantFieldConfig(tenantId);
    if (fieldConfig.length === 0) {
      await completeJob(jobId, 'failed', 'No field configuration found for tenant');
      return;
    }
    // Step 3: Get existing leads for deduplication
    const dedupeFields = [
      'name',
      'phone',
      'email'
    ].filter((fieldName)=>fieldConfig.some((f)=>f.field_name === fieldName));
    if (dedupeFields.length === 0) {
      dedupeFields.push('name');
    }
    const existingKeys = await getExistingLeads(tenantId, dedupeFields);
    // Step 4: Create chunks
    const totalChunks = Math.ceil(records.length / chunkSize);
    console.log(`📦 Processing ${records.length} records in ${totalChunks} chunks of ${chunkSize}`);
    // Create chunk records
    const chunkRecords = [];
    for(let i = 0; i < totalChunks; i++){
      const startRow = i * chunkSize + 1;
      const endRow = Math.min((i + 1) * chunkSize, records.length);
      chunkRecords.push({
        job_id: jobId,
        chunk_number: i + 1,
        start_row: startRow,
        end_row: endRow,
        status: 'pending'
      });
    }
    await supabase.from('bulk_upload_chunks').insert(chunkRecords);
    await supabase.from('bulk_upload_jobs').update({
      total_chunks: totalChunks
    }).eq('id', jobId);
    // Step 5: Process chunks
    let totalProcessed = 0;
    for(let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++){
      const chunkNumber = chunkIndex + 1;
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, records.length);
      const chunkRecords = records.slice(start, end);
      console.log(`📦 Processing chunk ${chunkNumber}/${totalChunks} (${chunkRecords.length} records)`);
      // Mark chunk as processing
      await supabase.from('bulk_upload_chunks').update({
        status: 'processing',
        started_at: new Date().toISOString()
      }).eq('job_id', jobId).eq('chunk_number', chunkNumber);
      // Process the chunk
      const chunkResult = await processChunk(chunkRecords, fieldConfig, existingKeys, tenantId, campaignId, fieldMapping);
      totalProcessed += chunkRecords.length;
      // Update progress
      await updateJobProgress(jobId, chunkNumber, chunkResult, totalProcessed, records.length);
      console.log(`✅ Chunk ${chunkNumber} complete: ${chunkResult.successful} successful, ${chunkResult.failed} failed, ${chunkResult.duplicates} duplicates`);
      // Add delay between chunks to avoid overwhelming the database
      if (chunkIndex < totalChunks - 1) {
        await new Promise((resolve)=>setTimeout(resolve, 2000)); // 2 second delay
      }
    }
    // Job completed successfully
    await completeJob(jobId, 'completed');
  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    await completeJob(jobId, 'failed', error.message);
  }
}

// Main Edge Function handler
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    console.log('🔄 Bulk upload processor started');
    // Get next job from queue
    const workerId = `worker-${Date.now()}`;
    const { data: jobs, error } = await supabase.rpc('get_next_job_from_queue', {
      p_worker_id: workerId
    });
    if (error) {
      console.error('❌ Error getting job from queue:', error);
      return new Response(JSON.stringify({
        error: 'Failed to get job from queue'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!jobs || jobs.length === 0) {
      console.log('📭 No jobs in queue');
      return new Response(JSON.stringify({
        message: 'No jobs to process'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const job = jobs[0];
    console.log('🎯 Raw job data from queue:', JSON.stringify(job, null, 2));
    // Extract job ID from different possible structures
    const jobId = job.job_id || job.id;
    if (!jobId) {
      throw new Error('No job ID found in job data');
    }
    console.log(`🎯 Processing job: ${jobId}`);
    // Process the job
    await processJob(jobId, job);
    return new Response(JSON.stringify({
      success: true,
      message: `Job ${jobId} processed successfully`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Processor error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});