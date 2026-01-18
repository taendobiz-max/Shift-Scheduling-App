/**
 * Multi-Day Business Pair Handler (Fixed Version)
 * 
 * Handles round-trip overnight bus operations where:
 * - Same employee(s) handle both outbound and return legs
 * - Galaxy team departs on odd dates, Aube team on even dates
 * - Supports both one-person and two-person operations
 */

interface Employee {
  employee_id?: string;
  従業員id?: string;
  name?: string;
  氏名?: string;
  従業員名?: string;
  班?: string;
  team?: string;
  [key: string]: any;
}

interface Business {
  業務id?: string;
  business_id?: string;
  業務名?: string;
  business_name?: string;
  運行日数?: number;
  duration?: number;
  方向?: string;
  direction?: string;
  営業所?: string;
  location?: string;
  業務グループ?: string;
  business_group?: string;
  必要人数?: number;
  required_people?: number;
  [key: string]: any;
}

interface BusinessPair {
  baseName: string;
  outbound: Business;
  return: Business;
  requiredPeople: number; // 1 for one-person, 2 for two-person
}

/**
 * Detect business pairs (outbound + return)
 */
export function detectBusinessPairs(businesses: Business[]): BusinessPair[] {
  const pairs: Map<string, { outbound?: Business; return?: Business }> = new Map();
  
  businesses.forEach(business => {
    const name = business.業務名 || business.business_name || '';
    const direction = business.方向 || business.direction || '';
    const duration = business.運行日数 || business.duration || 1;
    
    // Only process 2-day businesses
    if (duration !== 2) return;
    
    // Extract base name by removing direction suffix
    const baseName = name.replace(/[（(]往路[）)]/, '').replace(/[（(]復路[）)]/, '').trim();
    
    if (!pairs.has(baseName)) {
      pairs.set(baseName, {});
    }
    
    const pair = pairs.get(baseName)!;
    
    if (direction === 'outbound' || name.includes('往路')) {
      pair.outbound = business;
    } else if (direction === 'return' || name.includes('復路')) {
      pair.return = business;
    }
  });
  
  // Convert to array of complete pairs
  const completePairs: BusinessPair[] = [];
  
  for (const [baseName, pair] of Array.from(pairs.entries())) {
    if (pair.outbound && pair.return) {
      const requiredPeople = pair.outbound.必要人数 || pair.outbound.required_people || 1;
      completePairs.push({
        baseName,
        outbound: pair.outbound,
        return: pair.return,
        requiredPeople
      });
    }
  }
  
  console.log(`📊 Detected ${completePairs.length} business pairs`);
  completePairs.forEach(p => {
    console.log(`  - ${p.baseName} (${p.requiredPeople}名)`);
  });
  
  return completePairs;
}

/**
 * Determine which team departs on a given date
 * - Odd dates: Galaxy team departs
 * - Even dates: Aube team departs
 */
function getDepartingTeam(date: Date): 'Galaxy' | 'Aube' {
  const day = date.getDate();
  return day % 2 === 1 ? 'Galaxy' : 'Aube';
}

/**
 * Select employees for a round-trip operation
 */
function selectEmployeesForRoundTrip(
  employees: Employee[],
  team: 'Galaxy' | 'Aube',
  requiredPeople: number,
  businessGroup: string,
  usedEmployees: Set<string>
): Employee[] {
  const teamEmployees = employees.filter(emp => {
    const empId = emp.employee_id || emp.従業員ID || emp.従業員id || emp.id || '';
    const empTeam = emp.班 || emp.team || '';
    
    // Must be in the specified team and not already used
    // 「無し」の従業員はどちらのチームにも割り当て可能
    const isInTeam = empTeam === team || empTeam === '無し' || empTeam === '';
    return isInTeam && !usedEmployees.has(empId);
  });
  
  console.log(`  🔍 Available ${team} team members: ${teamEmployees.length}`);
  
  if (teamEmployees.length < requiredPeople) {
    console.log(`  ⚠️ Not enough ${team} team members (need ${requiredPeople}, have ${teamEmployees.length})`);
    return [];
  }
  
  // Select the required number of employees
  const selected = teamEmployees.slice(0, requiredPeople);
  
  // Mark as used
  selected.forEach(emp => {
    const empId = emp.employee_id || emp.従業員ID || emp.従業員id || emp.id || '';
    usedEmployees.add(empId);
  });
  
  return selected;
}

/**
 * Assign a business pair (round-trip) to employees
 */
function assignBusinessPair(
  pair: BusinessPair,
  employees: Employee[],
  startDate: Date,
  usedEmployees: Set<string>,
  batchId: string
): any[] {
  const team = getDepartingTeam(startDate);
  
  console.log(`\n📅 ${startDate.toISOString().split('T')[0]} - ${pair.baseName}`);
  console.log(`  🚌 Departing team: ${team}`);
  console.log(`  👥 Required people: ${pair.requiredPeople}`);
  
  // Select employees
  const selectedEmployees = selectEmployeesForRoundTrip(
    employees,
    team,
    pair.requiredPeople,
    pair.outbound.業務グループ || pair.outbound.business_group || '',
    usedEmployees
  );
  
  if (selectedEmployees.length === 0) {
    console.log(`  ❌ No eligible employees found`);
    return [];
  }
  
  console.log(`  ✅ Selected: ${selectedEmployees.map(e => e.name || e.氏名 || e.従業員名).join(', ')}`);
  
  // Generate shifts for each employee
  const shifts: any[] = [];
  const pairSetId = `ROUNDTRIP_${pair.baseName}_${startDate.toISOString().split('T')[0]}_${team}`;
  
  selectedEmployees.forEach(employee => {
    const empId = employee.employee_id || employee.従業員ID || employee.従業員id || employee.id || '';
    
    // Day 1: Outbound (departure from Tokyo)
    const day1Shift = {
      date: startDate,
      employee_id: empId,
      business_name: pair.outbound.業務名 || pair.outbound.business_name,
      business_master_id: pair.outbound.業務id || pair.outbound.business_id,
      location: pair.outbound.営業所 || pair.outbound.location,
      multi_day_set_id: pairSetId,
      multi_day_info: {
        day: 1,
        total_days: 2,
        direction: 'outbound',
        team: team,
        pair_name: pair.baseName,
        required_people: pair.requiredPeople
      }
    };
    
    // Day 2: Return (arrival back to Tokyo)
    const day2Date = new Date(startDate);
    day2Date.setDate(day2Date.getDate() + 1);
    
    const day2Shift = {
      date: day2Date,
      employee_id: empId,
      business_name: pair.return.業務名 || pair.return.business_name,
      business_master_id: pair.return.業務id || pair.return.business_id,
      location: pair.return.営業所 || pair.return.location,
      multi_day_set_id: pairSetId,
      multi_day_info: {
        day: 2,
        total_days: 2,
        direction: 'return',
        team: team,
        pair_name: pair.baseName,
        required_people: pair.requiredPeople
      }
    };
    
    shifts.push(day1Shift, day2Shift);
  });
  
  console.log(`  📝 Generated ${shifts.length} shifts (${pair.requiredPeople} employees × 2 days)`);
  
  return shifts;
}

/**
 * Main function to assign multi-day business pairs
 */
export function assignMultiDayBusinessPairs(
  employees: Employee[],
  businesses: Business[],
  dateRange: { start: Date | string; end: Date | string },
  batchId: string
): any[] {
  console.log('\n🚀 Starting multi-day business pair assignment');
  console.log('🔍 DEBUG - dateRange.start type:', typeof dateRange.start, 'value:', dateRange.start);
  console.log('🔍 DEBUG - dateRange.end type:', typeof dateRange.end, 'value:', dateRange.end);
  
  // Convert string dates to Date objects if needed
  const startDate = typeof dateRange.start === 'string' ? new Date(dateRange.start) : dateRange.start;
  const endDate = typeof dateRange.end === 'string' ? new Date(dateRange.end) : dateRange.end;
  
  console.log('🔍 DEBUG - startDate:', startDate, 'isValid:', !isNaN(startDate.getTime()));
  console.log('🔍 DEBUG - endDate:', endDate, 'isValid:', !isNaN(endDate.getTime()));
  
  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  } else {
    console.error('❌ Invalid date range detected!');
    return [];
  }
  
  const pairs = detectBusinessPairs(businesses);
  
  // Update dateRange to use Date objects
  const normalizedDateRange = { start: startDate, end: endDate };
  
  if (pairs.length === 0) {
    console.log('⚠️ No business pairs detected');
    return [];
  }
  
  const allShifts: any[] = [];
  const usedEmployees: Set<string> = new Set();
  // Generate shifts for each day in the range
  const currentDate = new Date(normalizedDateRange.start);
  
  while (currentDate <= normalizedDateRange.end) {
    console.log(`\n📆 Processing date: ${currentDate.toISOString().split('T')[0]}`);
    
    // For each business pair, try to assign
    pairs.forEach(pair => {
      const shifts = assignBusinessPair(
        pair,
        employees,
        new Date(currentDate),
        usedEmployees,
        batchId
      );
      
      allShifts.push(...shifts);
    });
    
    // Move to next date
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`\n🎉 Multi-day generation complete: ${allShifts.length} total shifts`);
  
  return allShifts;
}
