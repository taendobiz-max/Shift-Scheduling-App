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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🔵🔵🔵 MIDDLEWARE - Request received: [${req.method}] ${req.url} 🔵🔵🔵`);
  if (req.url === '/api/generate-shifts') {
    console.log('🟡🟡🟡 MIDDLEWARE - This is generate-shifts endpoint! 🟡🟡🟡');
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate shifts endpoint
app.post('/api/generate-shifts', async (req, res) => {
  try {
    console.log('🟢🟢🟢 NEW SERVER.JS - Received shift generation request 🟢🟢🟢');
    const { employees, businessMasters, dateRange, pairGroups, location } = req.body;
    
    if (!employees || !businessMasters || !dateRange) {
      console.log('❌ Missing parameters:', { 
        hasEmployees: !!employees, 
        hasBusinessMasters: !!businessMasters, 
        hasDateRange: !!dateRange 
      });
      return res.status(400).json({ 
        error: 'Missing required parameters'
      });
    }
    
    console.log(`📊 NEW SERVER.JS - Processing ${dateRange.length} days for ${employees.length} employees`);
    
    // Call generateShifts once with the entire date range
    const result = await generateShifts(
      employees,
      businessMasters,
      dateRange,
      pairGroups,
      location
    );
    
    console.log('✅ Shift generation completed');
    console.log(`📦 Result summary: ${result.shifts?.length || 0} shifts generated`);
    
    // Log first shift to check multi_day_set_id
    if (result.shifts && result.shifts.length > 0) {
      console.log('🔍 First shift sample:', JSON.stringify(result.shifts[0], null, 2));
    }
    
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ Error in /api/generate-shifts:', error);
    console.error('❌ Stack trace:', error.stack);
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
