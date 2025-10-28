const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = 'https://hbqrxqvdyxkjhiqlmwkd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhicXJ4cXZkeXhramhpcWxtd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0MTU5MjQsImV4cCI6MjA0NDk5MTkyNH0.WZVvfCMdE1Xz2Nv5cYJdZxvOGZJgZYqLgOPTx6VlAYc';
const supabase = createClient(supabaseUrl, supabaseKey);

// Load business history from DB
async function loadBusinessHistory() {
  console.log('🔍 Loading business history from DB');
  const history = new Map();
  
  try {
    const { data, error } = await supabase
      .from('app_9213e72257_employee_business_history')
      .select('employee_id, business_id');
    
    if (error) {
      console.error('⚠️ Failed to load history:', error);
      return history;
    }
    
    if (data) {
      data.forEach(record => {
        if (!history.has(record.employee_id)) {
          history.set(record.employee_id, new Set());
        }
        history.get(record.employee_id).add(record.business_id);
      });
    }
    
    console.log(`📚 Loaded history for ${history.size} employees (${data?.length || 0} records)`);
  } catch (err) {
    console.error('❌ Error loading history:', err);
  }
  
  return history;
}

// Save business history to DB
async function saveBusinessHistory(employeeId, businessId, date) {
  try {
    await supabase
      .from('app_9213e72257_employee_business_history')
      .upsert({
        employee_id: employeeId,
        business_id: businessId,
        last_assigned_date: date,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'employee_id,business_id'
      });
  } catch (err) {
    console.error('⚠️ Failed to save history:', err);
  }
}

// Generate shifts for multiple days
async function generateShifts(employees, businessMasters, dateRange, pairGroups, location) {
  console.log(`🚀 Starting shift generation for ${dateRange.length} days`);
  
  const allShifts = [];
  const allViolations = [];
  const allUnassigned = [];
  
  try {
    for (const date of dateRange) {
      console.log(`📅 Processing ${date}`);
      
      // Load fresh history from DB for each day
      const businessHistory = await loadBusinessHistory();
      
      const result = await generateShiftsForDay(
        employees,
        businessMasters,
        date,
        pairGroups,
        location,
        businessHistory
      );
      
      allShifts.push(...(result.shifts || []));
      allViolations.push(...(result.violations || []));
      allUnassigned.push(...(result.unassigned || []));
      
      console.log(`✅ ${date}: ${result.shifts?.length || 0} shifts`);
      
      // Small delay to ensure DB writes complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Total: ${allShifts.length} shifts generated`);
    
    return {
      success: true,
      shifts: allShifts,
      violations: allViolations,
      unassigned: allUnassigned,
      summary: {
        total_shifts: allShifts.length,
        total_days: dateRange.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return {
      success: false,
      error: error.message,
      shifts: allShifts
    };
  }
}

// Generate shifts for a single day
async function generateShiftsForDay(employees, businessMasters, targetDate, pairGroups, location, businessHistory) {
  const batchId = uuidv4();
  const shifts = [];
  const violations = [];
  const unassigned = [];
  
  // Load vacation data
  const { data: vacationData } = await supabase
    .from("app_9213e72257_vacation_masters")
    .select("employee_id")
    .eq("vacation_date", targetDate);
  
  const vacationIds = new Set();
  if (vacationData) {
    vacationData.forEach(v => vacationIds.add(v.employee_id));
  }
  
  // Filter available employees
  const available = employees.filter(emp => {
    const empId = emp.employee_id || emp.従業員ID;
    return !vacationIds.has(empId);
  });
  
  console.log(`👥 Available: ${available.length}/${employees.length}`);
  
  // Track assignments
  const assignments = new Map();
  available.forEach(emp => {
    const empId = emp.employee_id || emp.従業員ID;
    assignments.set(empId, 0);
  });
  
  // PHASE 0: Roll call duties
  const rollCallBiz = businessMasters.filter(biz => {
    const name = biz.業務名 || biz.name || '';
    const group = biz.業務グループ || biz.business_group || '';
    return name.includes('点呼') || group.includes('点呼');
  });
  
  for (const biz of rollCallBiz) {
    const capable = available.filter(emp => 
      emp.roll_call_capable === true || 
      emp.点呼対応者 === '1' || 
      emp.roll_call_duty === '1'
    );
    
    if (capable.length > 0) {
      const sorted = capable.sort((a, b) => {
        const aId = a.employee_id || a.従業員ID;
        const bId = b.employee_id || b.従業員ID;
        const aHist = businessHistory.get(aId)?.size || 0;
        const bHist = businessHistory.get(bId)?.size || 0;
        const aCount = assignments.get(aId) || 0;
        const bCount = assignments.get(bId) || 0;
        
        if (aHist !== bHist) return aHist - bHist;
        return aCount - bCount;
      });
      
      const selected = sorted[0];
      const empId = selected.employee_id || selected.従業員ID;
      const bizId = biz.業務ID || biz.business_id;
      
      shifts.push({
        id: uuidv4(),
        shift_date: targetDate,
        employee_id: empId,
        employee_name: selected.name || selected.氏名,
        business_group: biz.業務グループ || biz.business_group,
        shift_type: biz.業務名 || biz.name,
        start_time: biz.開始時間 || biz.start_time,
        end_time: biz.終了時間 || biz.end_time,
        status: 'confirmed',
        generation_batch_id: batchId
      });
      
      assignments.set(empId, (assignments.get(empId) || 0) + 1);
      await saveBusinessHistory(empId, bizId, targetDate);
      
      console.log(`✅ Roll call: ${biz.業務名 || biz.name} → ${selected.name || selected.氏名}`);
    }
  }
  
  // PHASE 1 & 2: Other businesses
  const otherBiz = businessMasters.filter(biz => {
    const name = biz.業務名 || biz.name || '';
    const group = biz.業務グループ || biz.business_group || '';
    return !name.includes('点呼') && !group.includes('点呼');
  });
  
  for (const biz of otherBiz) {
    const bizId = biz.業務ID || biz.business_id;
    
    const sorted = available.sort((a, b) => {
      const aId = a.employee_id || a.従業員ID;
      const bId = b.employee_id || b.従業員ID;
      
      const aHasBiz = businessHistory.get(aId)?.has(bizId) || false;
      const bHasBiz = businessHistory.get(bId)?.has(bizId) || false;
      
      // Prioritize employees who haven't done this business
      if (aHasBiz !== bHasBiz) return aHasBiz ? 1 : -1;
      
      const aHist = businessHistory.get(aId)?.size || 0;
      const bHist = businessHistory.get(bId)?.size || 0;
      if (aHist !== bHist) return aHist - bHist;
      
      const aCount = assignments.get(aId) || 0;
      const bCount = assignments.get(bId) || 0;
      return aCount - bCount;
    });
    
    if (sorted.length > 0) {
      const selected = sorted[0];
      const empId = selected.employee_id || selected.従業員ID;
      
      shifts.push({
        id: uuidv4(),
        shift_date: targetDate,
        employee_id: empId,
        employee_name: selected.name || selected.氏名,
        business_group: biz.業務グループ || biz.business_group,
        shift_type: biz.業務名 || biz.name,
        start_time: biz.開始時間 || biz.start_time,
        end_time: biz.終了時間 || biz.end_time,
        status: 'confirmed',
        generation_batch_id: batchId
      });
      
      assignments.set(empId, (assignments.get(empId) || 0) + 1);
      await saveBusinessHistory(empId, bizId, targetDate);
    } else {
      unassigned.push(biz.業務名 || biz.name);
    }
  }
  
  // Save shifts to DB
  if (shifts.length > 0) {
    const { error } = await supabase
      .from('app_9213e72257_shifts')
      .insert(shifts);
    
    if (error) {
      console.error('⚠️ Failed to save shifts:', error);
      violations.push(`Failed to save: ${error.message}`);
    } else {
      console.log(`💾 Saved ${shifts.length} shifts`);
    }
  }
  
  return { shifts, violations, unassigned };
}

module.exports = { generateShifts };

