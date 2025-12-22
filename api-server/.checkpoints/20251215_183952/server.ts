import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateShifts } from './shiftGenerator';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate shifts endpoint
app.post('/api/generate-shifts', async (req, res) => {
  try {
    console.log('📥 Received shift generation request');
    const { employees, businessMasters, dateRange, pairGroups, location } = req.body;
    
    if (!employees || !businessMasters || !dateRange) {
      return res.status(400).json({ 
        error: 'Missing required parameters'
      });
    }
    
    console.log(`📊 Processing ${dateRange.length} days for ${employees.length} employees`);
    
    // Call generateShifts once with the entire date range
    const result = await generateShifts(
      employees,
      businessMasters,
      dateRange,
      pairGroups,
      location
    );
    
    console.log('✅ Shift generation completed');
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Business rules endpoints
app.get('/api/business-rules', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_rules')
      .select('*')
      .order('priority', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching business rules:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/business-rules/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_rules')
      .select('*')
      .eq('rule_id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching business rule:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/business-rules', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_rules')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    console.error('Error creating business rule:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/business-rules/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_rules')
      .update(req.body)
      .eq('rule_id', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    console.error('Error updating business rule:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/business-rules/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('business_rules')
      .delete()
      .eq('rule_id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting business rule:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});
