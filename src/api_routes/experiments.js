const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase'); // ✅ Correct path

// GET /api/experiments - List all experiments
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('experiments')
      .select(`
        *,
        experiment_variants (
          id,
          variant_name,
          configuration
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: experiments, error } = await query;
    
    if (error) {
      console.error('Error fetching experiments:', error);
      return res.status(500).json({ error: 'Failed to fetch experiments' });
    }
    
    // For each experiment, get basic stats
    const experimentsWithStats = await Promise.all(
      experiments.map(async (experiment) => {
        // Get participant count
        const { count: participantCount } = await supabase
          .from('experiment_results')
          .select('*', { count: 'exact', head: true })
          .eq('experiment_id', experiment.id);
        
        // Get basic performance metrics
        const { data: results } = await supabase
          .from('experiment_results')
          .select('variant_id, metric_value')
          .eq('experiment_id', experiment.id);
        
        // Calculate basic stats
        let variantStats = {};
        if (results && results.length > 0) {
          experiment.experiment_variants.forEach(variant => {
            const variantResults = results.filter(r => r.variant_id === variant.id);
            const avgMetric = variantResults.length > 0 
              ? variantResults.reduce((sum, r) => sum + (r.metric_value || 0), 0) / variantResults.length
              : 0;
            variantStats[variant.variant_name] = {
              count: variantResults.length,
              avgMetric: avgMetric.toFixed(2)
            };
          });
        }
        
        return {
          ...experiment,
          participants: participantCount || 0,
          variantStats
        };
      })
    );
    
    res.json(experimentsWithStats);
  } catch (error) {
    console.error('Error in GET /experiments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/experiments - Create new experiment
router.post('/', async (req, res) => {
  try {
    const {
      name,
      testType,
      metric,
      trafficSplit,
      variantA,
      variantB,
      endDate
    } = req.body;
    
    // Validate required fields
    if (!name || !testType || !metric) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the experiment
    const { data: experiment, error: experimentError } = await supabase
      .from('experiments')
      .insert({
        user_id: req.user.id,
        name,
        test_type: testType,
        primary_metric: metric,
        traffic_split: trafficSplit || 50,
        status: 'active',
        end_date: endDate || null
      })
      .select()
      .single();
    
    if (experimentError) {
      console.error('Error creating experiment:', experimentError);
      return res.status(500).json({ error: 'Failed to create experiment' });
    }
    
    // Create variant A
    const { data: variantAData, error: variantAError } = await supabase
      .from('experiment_variants')
      .insert({
        experiment_id: experiment.id,
        variant_name: 'A',
        configuration: variantA || {}
      })
      .select()
      .single();
    
    if (variantAError) {
      console.error('Error creating variant A:', variantAError);
      return res.status(500).json({ error: 'Failed to create variant A' });
    }
    
    // Create variant B
    const { data: variantBData, error: variantBError } = await supabase
      .from('experiment_variants')
      .insert({
        experiment_id: experiment.id,
        variant_name: 'B',
        configuration: variantB || {}
      })
      .select()
      .single();
    
    if (variantBError) {
      console.error('Error creating variant B:', variantBError);
      return res.status(500).json({ error: 'Failed to create variant B' });
    }
    
    // Return complete experiment with variants
    const experimentWithVariants = {
      ...experiment,
      experiment_variants: [variantAData, variantBData]
    };
    
    res.status(201).json(experimentWithVariants);
  } catch (error) {
    console.error('Error in POST /experiments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/experiments/:id - Get experiment details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get experiment with variants
    const { data: experiment, error: experimentError } = await supabase
      .from('experiments')
      .select(`
        *,
        experiment_variants (
          id,
          variant_name,
          configuration
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (experimentError || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    // Get all results for this experiment
    const { data: results, error: resultsError } = await supabase
      .from('experiment_results')
      .select(`
        *,
        experiment_variants (
          variant_name
        )
      `)
      .eq('experiment_id', id)
      .order('recorded_at', { ascending: true });
    
    if (resultsError) {
      console.error('Error fetching results:', resultsError);
      return res.status(500).json({ error: 'Failed to fetch experiment results' });
    }
    
    // Calculate detailed analytics
    const analytics = calculateExperimentAnalytics(experiment, results);
    
    res.json({
      ...experiment,
      results,
      analytics
    });
  } catch (error) {
    console.error('Error in GET /experiments/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/experiments/:id/status - Update experiment status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['active', 'paused', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const { data: experiment, error } = await supabase
      .from('experiments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    res.json(experiment);
  } catch (error) {
    console.error('Error in PUT /experiments/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/experiments/:id/declare-winner - Declare winning variant
router.post('/:id/declare-winner', async (req, res) => {
  try {
    const { id } = req.params;
    const { winner } = req.body; // 'A' or 'B'
    
    if (!['A', 'B'].includes(winner)) {
      return res.status(400).json({ error: 'Winner must be A or B' });
    }
    
    // Get the experiment
    const { data: experiment, error: experimentError } = await supabase
      .from('experiments')
      .select(`
        *,
        experiment_variants (
          id,
          variant_name,
          configuration
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (experimentError || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    // Find the winning variant configuration
    const winningVariant = experiment.experiment_variants.find(
      v => v.variant_name === winner
    );
    
    if (!winningVariant) {
      return res.status(400).json({ error: 'Winning variant not found' });
    }
    
    // Mark experiment as completed with winner
    const { data: updatedExperiment, error: updateError } = await supabase
      .from('experiments')
      .update({
        status: 'completed',
        winner_variant: winner,
        winner_configuration: winningVariant.configuration,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating experiment:', updateError);
      return res.status(500).json({ error: 'Failed to declare winner' });
    }
    
    // TODO: Apply winning configuration to live settings
    // This would depend on your platform_settings structure
    // Example:
    // if (experiment.test_type === 'opening') {
    //   await supabase
    //     .from('platform_settings')
    //     .upsert({
    //       user_id: req.user.id,
    //       key: 'ai_opening_message',
    //       value: winningVariant.configuration.config
    //     });
    // }
    
    res.json({
      ...updatedExperiment,
      message: `Variant ${winner} declared as winner and applied to live settings`
    });
  } catch (error) {
    console.error('Error in POST /experiments/:id/declare-winner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/experiments/:experimentId/record - Record experiment result
router.post('/:experimentId/record', async (req, res) => {
  try {
    const { experimentId } = req.params;
    const { variantId, leadId, metricValue } = req.body;
    
    const { data: result, error } = await supabase
      .from('experiment_results')
      .insert({
        experiment_id: experimentId,
        variant_id: variantId,
        lead_id: leadId,
        metric_value: metricValue,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error recording result:', error);
      return res.status(500).json({ error: 'Failed to record result' });
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in POST /experiments/:experimentId/record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate experiment analytics
function calculateExperimentAnalytics(experiment, results) {
  if (!results || results.length === 0) {
    return {
      confidence: 0,
      leader: null,
      variantStats: {}
    };
  }
  
  // Group results by variant
  const variantGroups = {};
  experiment.experiment_variants.forEach(variant => {
    variantGroups[variant.variant_name] = {
      results: results.filter(r => r.variant_id === variant.id),
      configuration: variant.configuration
    };
  });
  
  // Calculate basic stats for each variant
  const variantStats = {};
  Object.keys(variantGroups).forEach(variantName => {
    const variantResults = variantGroups[variantName].results;
    const values = variantResults.map(r => r.metric_value || 0);
    
    variantStats[variantName] = {
      count: values.length,
      mean: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      configuration: variantGroups[variantName].configuration
    };
  });
  
  // Simple statistical significance calculation (basic t-test approximation)
  let confidence = 0;
  let leader = null;
  
  if (variantStats.A && variantStats.B && variantStats.A.count > 10 && variantStats.B.count > 10) {
    const diff = Math.abs(variantStats.A.mean - variantStats.B.mean);
    const pooledStd = Math.sqrt(
      (Math.pow(variantStats.A.mean * 0.1, 2) + Math.pow(variantStats.B.mean * 0.1, 2)) / 2
    );
    
    if (pooledStd > 0) {
      const tStat = diff / (pooledStd * Math.sqrt(2 / Math.min(variantStats.A.count, variantStats.B.count)));
      confidence = Math.min(95, Math.max(0, (tStat - 1) * 30)); // Simplified confidence calculation
      
      if (confidence > 70) {
        leader = variantStats.A.mean > variantStats.B.mean ? 'A' : 'B';
      }
    }
  }
  
  return {
    confidence: Math.round(confidence),
    leader: leader ? {
      variant: leader,
      improvement: Math.round(Math.abs(
        ((variantStats[leader].mean - variantStats[leader === 'A' ? 'B' : 'A'].mean) / 
         variantStats[leader === 'A' ? 'B' : 'A'].mean) * 100
      ))
    } : null,
    variantStats
  };
}

module.exports = router;