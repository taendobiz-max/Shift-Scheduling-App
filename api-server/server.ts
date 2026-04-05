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
    console.log('🟢🟢🟢 SERVER.TS - Received shift generation request 🟢🟢🟢');
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
    
    console.log(`📊 SERVER.TS - Processing ${dateRange.length} days for ${employees.length} employees`);
    
    const result = await generateShifts(
      employees,
      businessMasters,
      dateRange,
      pairGroups,
      location
    );
    
    console.log('✅ Shift generation completed');
    console.log(`📦 Result summary: ${result.shifts?.length || 0} shifts generated`);
    
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

// Manual shift assignment endpoint
app.post('/api/shifts', async (req, res) => {
  try {
    const { employee_id, business_id, date, location } = req.body;
    
    console.log('📝 Manual shift assignment request:', { employee_id, business_id, date, location });
    
    if (!employee_id || !business_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: employee_id, business_id, date'
      });
    }
    
    const { data, error } = await supabase
      .from('shifts')
      .insert([{
        employee_id,
        business_master_id: business_id,
        date,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error('❌ Error inserting shift:', error);
      throw error;
    }
    
    console.log('✅ Shift assigned successfully:', (data as any[])[0]);
    res.json({ success: true, shift: (data as any[])[0] });
  } catch (error: any) {
    console.error('Error assigning shift:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
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
    res.json((data as any[])[0]);
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
    res.json((data as any[])[0]);
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

// Delete employee endpoint
app.delete('/api/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log('🗑️ Deleting employee via API:', employeeId);
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('employee_id', employeeId);
    
    if (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
    
    console.log('✅ Employee deleted successfully via API');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== User Management API =====

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const { email, name, password, role, office } = req.body;
    console.log('👤 Creating user:', email);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      throw authError;
    }
    
    // Wait for trigger to create public.users record
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (office) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ office, role, name })
        .eq('id', authData.user.id);
      
      if (updateError) {
        console.error('⚠️ Error updating office:', updateError);
      }
    }
    
    console.log('✅ User created successfully');
    res.json({ success: true, user: authData.user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, role, office, password } = req.body;
    console.log('👤 Updating user:', userId);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ name, role, office })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      throw updateError;
    }
    
    if (password) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (pwError) {
        console.error('❌ Error updating password:', pwError);
        throw pwError;
      }
    }
    
    console.log('✅ User updated successfully');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🗑️ Deleting user:', userId);
    
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
    
    console.log('✅ User deleted successfully');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});
