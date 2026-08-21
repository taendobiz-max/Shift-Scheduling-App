import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateShifts } from './shiftGenerator';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, requireAuth, requireRole, validateDate, validateString, writeAuditLog } from './security';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://35.73.159.231')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // 同一オリジンのサーバー間通信と、明示許可した画面だけを許可する。
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));

const authRequired = requireAuth(supabase);
const managerRequired = requireRole(2);
const adminRequired = requireRole(3);

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
app.post('/api/generate-shifts', authRequired, managerRequired, async (req, res) => {
  try {
    console.log('🟢🟢🟢 SERVER.TS - Received shift generation request 🟢🟢🟢');
    const { employees, businessMasters, dateRange, pairGroups, location, options } = req.body;
    
    if (!Array.isArray(employees) || !Array.isArray(businessMasters) || !Array.isArray(dateRange) || dateRange.length === 0 || dateRange.length > 62 || employees.length > 1000 || businessMasters.length > 1000 || !validateString(location, 'location', 64)) {
      return res.status(400).json({ error: 'Invalid shift generation parameters' });
    }
    
    console.log(`📊 SERVER.TS - Processing ${dateRange.length} days for ${employees.length} employees`);
    if (options?.targetBusinessNames?.length > 0) {
      console.log(`🎯 SERVER.TS - Target businesses: ${options.targetBusinessNames.join(', ')}`);
    }
    if (options?.skipAssignedBusinesses) {
      console.log('⏭️ SERVER.TS - Skip assigned businesses mode: ON');
    }
    
    const result = await generateShifts(
      employees,
      businessMasters,
      dateRange,
      pairGroups,
      location,
      options
    );
    
    console.log('✅ Shift generation completed');
    console.log(`📦 Result summary: ${result.shifts?.length || 0} shifts generated`);
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'generate', 'shift_generation', null, {
      location,
      dateCount: dateRange.length,
      employeeCount: employees.length,
      businessCount: businessMasters.length,
      generationMode: options?.generationMode ?? 'all'
    });
    
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ Error in /api/generate-shifts:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
});

// Manual shift assignment endpoint
app.post('/api/shifts', authRequired, managerRequired, async (req, res) => {
  try {
    const { employee_id, business_id, date, location } = req.body;
    
    console.log('📝 Manual shift assignment request:', { employee_id, business_id, date, location });
    
    const safeEmployeeId = validateString(employee_id, 'employee_id', 128);
    const safeBusinessId = validateString(business_id, 'business_id', 128);
    const safeDate = validateDate(date);
    if (!safeEmployeeId || !safeBusinessId || !safeDate) {
      return res.status(400).json({ success: false, error: 'Invalid shift assignment parameters' });
    }
    
    const { data, error } = await supabase
      .from('shifts')
      .insert([{
        employee_id: safeEmployeeId,
        business_master_id: safeBusinessId,
        date: safeDate,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error('❌ Error inserting shift:', error);
      throw error;
    }
    
    console.log('✅ Shift assigned successfully');
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'create', 'shift', String((data as any[])[0]?.id ?? null), {
      employeeId: safeEmployeeId,
      businessId: safeBusinessId,
      date: safeDate,
      location: validateString(location, 'location', 64)
    });
    res.json({ success: true, shift: (data as any[])[0] });
  } catch (error: any) {
    console.error('Error assigning shift:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Atomic generated-shift replacement endpoint
app.post('/api/shifts/bulk', authRequired, managerRequired, async (req, res) => {
  try {
    const safeLocation = validateString(req.body?.location, 'location', 64);
    const requestedDates = req.body?.dates;
    const requestedShifts = req.body?.shifts;
    if (!safeLocation || !Array.isArray(requestedDates) || requestedDates.length === 0 || requestedDates.length > 62 || !Array.isArray(requestedShifts) || requestedShifts.length === 0 || requestedShifts.length > 10000) {
      return res.status(400).json({ success: false, error: 'Invalid bulk shift parameters' });
    }

    const safeDates = requestedDates.map((date: unknown) => validateDate(date));
    if (safeDates.some((date: string | null) => !date) || new Set(safeDates).size !== safeDates.length) {
      return res.status(400).json({ success: false, error: 'Invalid or duplicate target dates' });
    }

    const safeShifts = requestedShifts.map((shift: any) => {
      const employeeId = validateString(String(shift?.employee_id ?? ''), 'employee_id', 128);
      const businessMasterId = validateString(String(shift?.business_master_id ?? ''), 'business_master_id', 128);
      const businessName = validateString(String(shift?.business_name ?? ''), 'business_name', 200);
      const shiftDate = validateDate(shift?.date);
      if (!employeeId || !businessMasterId || !businessName || !shiftDate || !safeDates.includes(shiftDate)) throw new Error('INVALID_SHIFT');
      return {
        employee_id: employeeId,
        business_master_id: businessMasterId,
        business_name: businessName,
        date: shiftDate,
        created_at: typeof shift?.created_at === 'string' ? shift.created_at : null,
        multi_day_set_id: typeof shift?.multi_day_set_id === 'string' ? shift.multi_day_set_id : null,
        multi_day_info: shift?.multi_day_info ?? null,
      };
    });

    const { data, error } = await supabase.rpc('replace_shifts_atomically', {
      p_location: safeLocation,
      p_dates: safeDates,
      p_shifts: safeShifts,
    });
    if (error) throw error;
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'replace', 'shifts', null, {
      location: safeLocation, dateCount: safeDates.length, shiftCount: data,
    });
    res.json({ success: true, count: data });
  } catch (error: any) {
    if (error?.message === 'INVALID_SHIFT') return res.status(400).json({ success: false, error: 'Invalid shift data' });
    console.error('Error replacing shifts atomically:', error);
    res.status(500).json({ success: false, error: 'Unable to save shifts atomically' });
  }
});

// Atomic manual shift deletion endpoint
app.delete('/api/shifts/bulk', authRequired, managerRequired, async (req, res) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
      return res.status(400).json({ success: false, error: 'Invalid shift ids' });
    }
    const safeIds = ids.map((id: unknown) => validateString(String(id ?? ''), 'shift_id', 64));
    if (safeIds.some((id: string | null) => !id) || new Set(safeIds).size !== safeIds.length) {
      return res.status(400).json({ success: false, error: 'Invalid or duplicate shift ids' });
    }
    const { data, error } = await supabase.from('shifts').delete().in('id', safeIds).select('id');
    if (error) throw error;
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'delete', 'shifts', null, { count: data?.length ?? 0, ids: safeIds });
    res.json({ success: true, count: data?.length ?? 0 });
  } catch (error) {
    console.error('Error deleting shifts:', error);
    res.status(500).json({ success: false, error: 'Unable to delete shifts' });
  }
});

// Vacation management API
app.get('/api/vacations', authRequired, async (req, res) => {
  try {
    const startDate = req.query.startDate ? validateDate(String(req.query.startDate)) : null;
    const endDate = req.query.endDate ? validateDate(String(req.query.endDate)) : null;
    const location = req.query.location ? validateString(String(req.query.location), 'location', 64) : null;
    if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate) || (startDate && endDate && startDate > endDate) || (req.query.location && !location)) {
      return res.status(400).json({ error: 'Invalid vacation query parameters' });
    }

    let query = supabase.from('vacation_masters').select('*').order('vacation_date', { ascending: true });
    if (startDate) query = query.gte('vacation_date', startDate);
    if (endDate) query = query.lte('vacation_date', endDate);
    if (location) query = query.eq('location', location);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ vacations: data ?? [] });
  } catch (error) {
    console.error('Error listing vacations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/vacations/bulk', authRequired, async (req, res) => {
  try {
    const vacations = req.body?.vacations;
    if (!Array.isArray(vacations) || vacations.length === 0 || vacations.length > 62) {
      return res.status(400).json({ error: 'Invalid vacation batch' });
    }

    const seen = new Set<string>();
    const rows = vacations.map((vacation: any) => {
      const employeeId = validateString(vacation?.employee_id, 'employee_id', 128);
      const employeeName = validateString(vacation?.employee_name, 'employee_name', 100);
      const location = validateString(vacation?.location, 'location', 64);
      const vacationDate = validateDate(vacation?.vacation_date);
      const vacationType = validateString(vacation?.vacation_type, 'vacation_type', 32);
      const reason = validateString(vacation?.reason, 'reason', 500);
      if (!employeeId || !employeeName || !location || !vacationDate || !vacationType || !reason) throw new Error('INVALID_VACATION');
      const duplicateKey = `${employeeId}:${vacationDate}`;
      if (seen.has(duplicateKey)) throw new Error('DUPLICATE_VACATION');
      seen.add(duplicateKey);
      const now = new Date().toISOString();
      return { employee_id: employeeId, employee_name: employeeName, location, vacation_date: vacationDate, vacation_type: vacationType, reason, created_at: now, updated_at: now };
    });

    const { data, error } = await supabase.from('vacation_masters').insert(rows).select();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: '休暇が既に登録されている日付を含みます。登録は行われませんでした。' });
      throw error;
    }
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'create', 'vacation_batch', null, { count: rows.length, employeeId: rows[0].employee_id, dates: rows.map((row) => row.vacation_date) });
    res.status(201).json({ vacations: data ?? [] });
  } catch (error: any) {
    if (error?.message === 'INVALID_VACATION' || error?.message === 'DUPLICATE_VACATION') return res.status(400).json({ error: 'Invalid or duplicate vacation data' });
    console.error('Error creating vacation batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/vacations/:id', authRequired, async (req, res) => {
  try {
    const id = validateString(req.params.id, 'vacation_id', 64);
    const employeeId = validateString(req.body?.employee_id, 'employee_id', 128);
    const employeeName = validateString(req.body?.employee_name, 'employee_name', 100);
    const location = validateString(req.body?.location, 'location', 64);
    const vacationDate = validateDate(req.body?.vacation_date);
    const vacationType = validateString(req.body?.vacation_type, 'vacation_type', 32);
    const reason = validateString(req.body?.reason, 'reason', 500);
    if (!id || !employeeId || !employeeName || !location || !vacationDate || !vacationType || !reason) return res.status(400).json({ error: 'Invalid vacation parameters' });
    const { data, error } = await supabase.from('vacation_masters').update({ employee_id: employeeId, employee_name: employeeName, location, vacation_date: vacationDate, vacation_type: vacationType, reason, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: '休暇が既に登録されている日付です。' });
      throw error;
    }
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'update', 'vacation', id, { employeeId, vacationDate });
    res.json({ vacation: data });
  } catch (error) {
    console.error('Error updating vacation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/vacations/:id', authRequired, async (req, res) => {
  try {
    const id = validateString(req.params.id, 'vacation_id', 64);
    if (!id) return res.status(400).json({ error: 'Invalid vacation id' });
    const { error } = await supabase.from('vacation_masters').delete().eq('id', id);
    if (error) throw error;
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'delete', 'vacation', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vacation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Business rules endpoints
app.get('/api/business-rules', authRequired, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_rules')
      .select('*')
      .order('priority', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching business rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/business-rules/:id', authRequired, async (req, res) => {
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/business-rules', authRequired, managerRequired, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_rules')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    const createdRule = (data as any[])[0];
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'create', 'business_rule', String(createdRule?.rule_id ?? null));
    res.json(createdRule);
  } catch (error: any) {
    console.error('Error creating business rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/business-rules/:id', authRequired, managerRequired, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_rules')
      .update(req.body)
      .eq('rule_id', req.params.id)
      .select();
    
    if (error) throw error;
    const updatedRule = (data as any[])[0];
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'update', 'business_rule', req.params.id);
    res.json(updatedRule);
  } catch (error: any) {
    console.error('Error updating business rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/business-rules/:id', authRequired, managerRequired, async (req, res) => {
  try {
    const { error } = await supabase
      .from('business_rules')
      .delete()
      .eq('rule_id', req.params.id);
    
    if (error) throw error;
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'delete', 'business_rule', req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting business rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete employee endpoint
app.delete('/api/employees/:employeeId', authRequired, adminRequired, async (req, res) => {
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
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'delete', 'employee', employeeId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== User Management API =====

// User list (administrator only)
app.get('/api/users', authRequired, adminRequired, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, office, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
app.post('/api/users', authRequired, adminRequired, async (req, res) => {
  try {
    const { email, name, password, role, office } = req.body;
    const safeEmail = validateString(email, 'email', 254);
    const safeName = validateString(name, 'name', 100);
    const safePassword = validateString(password, 'password', 128);
    const safeOffice = office ? validateString(office, 'office', 64) : null;
    const safeRole = Number(role);
    if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail) || !safeName || !safePassword || safePassword.length < 8 || ![1, 2, 3].includes(safeRole)) {
      return res.status(400).json({ error: 'Invalid user parameters' });
    }
    console.log('👤 Creating user');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: safeEmail,
      password: safePassword,
      email_confirm: true,
      user_metadata: { name: safeName, role: safeRole }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      throw authError;
    }
    
    // Wait for trigger to create public.users record
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ office: safeOffice, role: safeRole, name: safeName })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('⚠️ Error updating user profile:', updateError);
      throw updateError;
    }
    
    console.log('✅ User created successfully');
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'create', 'user', authData.user.id, { role: safeRole, office: safeOffice });
    res.json({ success: true, user: authData.user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
app.put('/api/users/:userId', authRequired, adminRequired, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, role, office, password } = req.body;
    const safeName = validateString(name, 'name', 100);
    const safeOffice = office ? validateString(office, 'office', 64) : null;
    const safeRole = Number(role);
    const safePassword = password ? validateString(password, 'password', 128) : null;
    if (!safeName || ![1, 2, 3].includes(safeRole) || (password && (!safePassword || safePassword.length < 8))) {
      return res.status(400).json({ error: 'Invalid user parameters' });
    }
    console.log('👤 Updating user:', userId);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ name: safeName, role: safeRole, office: safeOffice })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      throw updateError;
    }
    
    if (safePassword) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(userId, { password: safePassword });
      if (pwError) {
        console.error('❌ Error updating password:', pwError);
        throw pwError;
      }
    }
    
    console.log('✅ User updated successfully');
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'update', 'user', userId, { role: safeRole, office: safeOffice, passwordChanged: Boolean(safePassword) });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
app.delete('/api/users/:userId', authRequired, adminRequired, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🗑️ Deleting user:', userId);
    
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
    
    console.log('✅ User deleted successfully');
    await writeAuditLog(supabase, req as AuthenticatedRequest, 'delete', 'user', userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});
