// src/api_routes/resolveCampaignRoute.js
const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needs insert permissions
)

router.post('/resolve-or-create', async (req, res) => {
  const { tenant_id, campaign_name, created_by_email } = req.body

  if (!tenant_id || !campaign_name || !created_by_email) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('name', campaign_name)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ error: fetchError.message })
    }

    if (existing) {
      return res.status(200).json({ campaign_id: existing.id, existing: true })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('campaigns')
      .insert({
        tenant_id,
        name: campaign_name,
        created_by_email,
        start_date: new Date().toISOString().split('T')[0],
        is_active: true
      })
      .select('id')
      .single()

    if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }

    return res.status(200).json({ campaign_id: inserted.id, existing: false })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Unexpected error' })
  }
})

module.exports = router
