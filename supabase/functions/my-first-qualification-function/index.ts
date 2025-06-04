import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- NEW HELPER FUNCTION FOR PHONE VALIDATION ---
// This function checks if a string contains at least 7 digits.
function isValidPhoneNumberFormat(phoneNumber: string): boolean {
  // Regex: \d matches any digit (0-9), {7,} means 7 or more occurrences.
  // .test() method returns true if the regex finds a match in the string.
  return /\d{7,}/.test(phoneNumber);
}
// --- END NEW HELPER FUNCTION ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Destructure tenant_id AND campaign_id from the request body
    let { name, phone, email, tenant_id, campaign_id } = await req.json() // <--- CORRECTED: ADDED campaign_id here
    let status;

    // Log the received lead data for debugging
    console.log('Received new lead for initial processing:', { name, phone, email, tenant_id, campaign_id });

    // --- UPDATED QUALIFICATION LOGIC ---

    // Rule: Required Fields & Format Check (Highest Priority)
    // If name is missing/empty, OR phone is missing/empty, OR phone does not look like a phone number
    if (
        !name || String(name).trim() === '' ||
        !phone || String(phone).trim() === '' ||
        !isValidPhoneNumberFormat(String(phone)) ||
        !tenant_id // Add tenant_id to the required checks
      )
    {
      status = 'Invalid Lead';
      console.log('Rule matched: Missing required field (Name or Phone or Tenant ID) OR invalid Phone format, setting status to "Invalid Lead".');
    }
    // Otherwise, if required fields are present and phone looks valid, set to 'Cold Lead'
    else {
      status = 'Cold Lead';
      console.log('Rule matched: Valid lead, setting initial status to "Cold Lead".');
    }
    // --- END OF UPDATED QUALIFICATION LOGIC ---


    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Supabase URL or Service Role Key not found in environment variables.')
    }

    const supabase = createClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false
        }
      }
    )

    // Include tenant_id AND campaign_id in the insert operation
    const { data, error } = await supabase
      .from('leads')
      .insert({ name, phone, email, status, tenant_id, campaign_id }) // <--- CORRECTED: ADDED campaign_id here
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, lead: data[0] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})