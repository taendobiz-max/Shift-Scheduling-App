/**
 * Multi-Day Business Pair Handler (Tokyo Cycle Version v3)
 *
 * Key insight from Excel analysis:
 * - The SAME employee handles BOTH the outbound (day 1) and return (day 2) legs
 * - Galaxy team departs on odd cycle-days (day 1,3,5,7), Aube on even (day 2,4,6,8)
 * - After 4 consecutive round-trips, each employee takes 2 consecutive days off
 * - Cycle state is carried over from the previous month
 * - Suspended (運休) dates pause the cycle without advancing it
 *
 * For businesses with fixed team assignment (班指定 = Galaxy/Aube):
 * - The business is assigned when the specified team is the departing team for that day
 * - e.g., "名古屋往路" (班指定=Galaxy) is used on Galaxy departing days
 * - e.g., "名古屋復路" (班指定=Aube) is used on Aube departing days
 *
 * For businesses with no fixed team (班指定 = none/null):
 * - The business is assigned based on the current cycle's departing team
 *
 * [Tokyo-specific rule] This logic applies only to the 東京 (Tokyo) location.
 * For other locations, the original date-parity logic is preserved.
 */

interface Employee {
  id?: string;
  employee_id?: string;
  従業員id?: string;
  name?: string;
  氏名?: string;
  従業員名?: string;
  班?: string;
  team?: string;
  roll_call_capable?: boolean;
  roll_call_duty?: string;
  [key: string]: any;
}

interface Business {
  業務id?: string;
  business_id?: string;
  id?: string;
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
  班指定?: string;
  班ローテーション?: boolean;
  [key: string]: any;
}

interface BusinessPair {
  baseName: string;
  outbound: Business;
  return: Business;
  requiredPeople: number;
  /** Fixed team for this pair's outbound leg (null = use cycle) */
  fixedTeam: 'Galaxy' | 'Aube' | null;
}

/**
 * Tokyo cycle state - carries over from previous month
 */
export interface TokyoCycleState {
  /** Which team departs on the NEXT active (non-suspended) cycle day: 'Galaxy' or 'Aube' */
  nextDepartingTeam: 'Galaxy' | 'Aube';
  /**
   * Per-employee trip count within the current 4-trip cycle.
   * Key: employee_id (numeric string like '00001150'), Value: 0-3
   * When tripCount reaches 4, the employee takes 2 rest days, then resets to 0.
   */
  employeeTripCounts: { [employeeId: string]: number };
  /**
   * Per-employee rest days remaining.
   * Key: employee_id, Value: 0, 1, or 2
   */
  employeeRestDaysRemaining: { [employeeId: string]: number };
}

function getEmpId(employee: Employee): string {
  return employee.employee_id || employee.従業員id || employee.id || '';
}

function getEmpTeam(employee: Employee): string {
  return employee.班 || employee.team || '';
}

/**
 * Detect business pairs (outbound + return)
 * Returns pairs grouped by base name.
 * Each pair has a fixedTeam if one of the businesses has 班指定 set.
 */
export function detectBusinessPairs(businesses: Business[]): BusinessPair[] {
  const pairs: Map<string, { outbound?: Business; return?: Business }> = new Map();

  businesses.forEach(business => {
    const name = business.業務名 || business.business_name || '';
    const direction = business.方向 || business.direction || '';
    const duration = Number(business.運行日数 || business.duration || 1);

    // Only process 2-day businesses
    if (duration !== 2) return;

    // Extract base name by removing direction suffix
    const baseName = name
      .replace(/[（(]往路[）)]/, '')
      .replace(/[（(]復路[）)]/, '')
      .replace(/往路$/, '')
      .replace(/復路$/, '')
      .trim();

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

  const result: BusinessPair[] = [];
  pairs.forEach((pair, baseName) => {
    if (pair.outbound && pair.return) {
      const requiredPeople = Number(pair.outbound.必要人数 || pair.outbound.required_people || 1);

      // Determine fixed team from 班指定 field on the outbound business
      const outboundTeamSpec = pair.outbound.班指定;
      let fixedTeam: 'Galaxy' | 'Aube' | null = null;
      if (outboundTeamSpec === 'Galaxy') {
        fixedTeam = 'Galaxy';
      } else if (outboundTeamSpec === 'Aube') {
        fixedTeam = 'Aube';
      }

      result.push({
        baseName,
        outbound: pair.outbound,
        return: pair.return,
        requiredPeople,
        fixedTeam
      });

      console.log(`📋 Business pair: ${baseName} (fixedTeam: ${fixedTeam ?? 'cycle-based'}, requiredPeople: ${requiredPeople})`);
    }
  });

  return result;
}

/**
 * Select employees for a specific team
 * The SAME employees will handle both outbound and return legs
 */
function selectEmployeesForTeam(
  employees: Employee[],
  team: 'Galaxy' | 'Aube',
  requiredPeople: number,
  businessGroup: string,
  usedEmployees: Set<string>,
  employeeSkillMatrix?: Map<string, Set<string>>,
  rollCallProtectionCount?: number,
  restingEmployees?: Set<string>
): Employee[] {
  const totalRollCallCapable = employees.filter(emp => {
    const empId = getEmpId(emp);
    return !usedEmployees.has(empId) && (emp.roll_call_capable === true || emp.roll_call_duty === '1');
  }).length;

  const protectCount = rollCallProtectionCount ?? 0;

  const teamEmployees = employees.filter(emp => {
    const empId = getEmpId(emp);
    const empTeam = getEmpTeam(emp);

    // Must be in the specified team
    const isInTeam = empTeam === team;
    if (!isInTeam || usedEmployees.has(empId)) return false;

    // Skip employees on rest days
    if (restingEmployees && restingEmployees.has(empId)) {
      console.log(`  💤 [REST] ${empId} is on rest day, skipping`);
      return false;
    }

    // Check skill matrix
    if (employeeSkillMatrix && businessGroup) {
      const uuidId = emp.id || empId;
      const empSkills = employeeSkillMatrix.get(uuidId) || employeeSkillMatrix.get(empId) || new Set<string>();
      if (!empSkills.has(businessGroup)) {
        return false;
      }
    }

    // Protect roll call capable employees if needed
    const isRollCallCapable = emp.roll_call_capable === true || emp.roll_call_duty === '1';
    if (isRollCallCapable && totalRollCallCapable <= protectCount) {
      console.log(`  🛡️ [ROLL_CALL_PROTECT] Protecting ${empId}`);
      return false;
    }

    return true;
  });

  console.log(`  🔍 Available ${team} team members for ${businessGroup}: ${teamEmployees.length}`);

  if (teamEmployees.length < requiredPeople) {
    console.log(`  ⚠️ Not enough ${team} team members (need ${requiredPeople}, have ${teamEmployees.length})`);
    return [];
  }

  const selected = teamEmployees.slice(0, requiredPeople);
  selected.forEach(emp => {
    const empId = getEmpId(emp);
    usedEmployees.add(empId);
  });

  return selected;
}

/**
 * Main function to assign multi-day business pairs
 * Supports Tokyo-specific cycle rules when tokyoCycleState is provided.
 */
export function assignMultiDayBusinessPairs(
  employees: Employee[],
  businesses: Business[],
  dateRange: { start: Date | string; end: Date | string },
  batchId: string,
  employeeSkillMatrix?: Map<string, Set<string>>,
  rollCallProtectionCount?: number,
  tokyoCycleState?: TokyoCycleState,
  suspendedDates?: string[]
): any[] {
  console.log('\n🚀 Starting multi-day business pair assignment (v3)');

  const startDate = typeof dateRange.start === 'string' ? new Date(dateRange.start) : dateRange.start;
  const endDate = typeof dateRange.end === 'string' ? new Date(dateRange.end) : dateRange.end;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('❌ Invalid date range detected!');
    return [];
  }

  console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  const pairs = detectBusinessPairs(businesses);
  if (pairs.length === 0) {
    console.log('⚠️ No business pairs detected');
    return [];
  }

  // Normalize suspended dates to YYYY-MM-DD strings
  const suspendedSet = new Set<string>(
    (suspendedDates || []).map(d => d.split('T')[0])
  );

  if (suspendedSet.size > 0) {
    console.log(`🚫 Suspended dates: ${Array.from(suspendedSet).join(', ')}`);
  }

  const isTokyoMode = !!tokyoCycleState;
  console.log(`🏙️ Tokyo cycle mode: ${isTokyoMode ? 'ON' : 'OFF'}`);

  const allShifts: any[] = [];

  if (isTokyoMode) {
    // ===== TOKYO CYCLE MODE =====
    allShifts.push(...assignWithTokyoCycle(
      employees,
      pairs,
      startDate,
      endDate,
      batchId,
      employeeSkillMatrix,
      rollCallProtectionCount,
      tokyoCycleState!,
      suspendedSet
    ));
  } else {
    // ===== LEGACY MODE (non-Tokyo) =====
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const usedEmployees: Set<string> = new Set();
      pairs.forEach(pair => {
        const shifts = assignBusinessPairLegacy(
          pair,
          employees,
          new Date(currentDate),
          usedEmployees,
          batchId,
          employeeSkillMatrix,
          rollCallProtectionCount
        );
        allShifts.push(...shifts);
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  console.log(`\n🎉 Multi-day generation complete: ${allShifts.length} total shifts`);
  return allShifts;
}

/**
 * Tokyo cycle mode assignment
 *
 * Key logic:
 * - Each day, select the departing team (Galaxy or Aube, alternating)
 * - Assign employees from that team to handle BOTH outbound (today) and return (tomorrow)
 * - Track each employee's trip count; after 4 trips, schedule 2 rest days
 * - Suspended dates pause the cycle
 */
function assignWithTokyoCycle(
  employees: Employee[],
  pairs: BusinessPair[],
  startDate: Date,
  endDate: Date,
  batchId: string,
  employeeSkillMatrix: Map<string, Set<string>> | undefined,
  rollCallProtectionCount: number | undefined,
  initialCycleState: TokyoCycleState,
  suspendedSet: Set<string>
): any[] {
  // Deep copy the cycle state so we don't mutate the original
  const cycleState: TokyoCycleState = {
    nextDepartingTeam: initialCycleState.nextDepartingTeam,
    employeeTripCounts: { ...initialCycleState.employeeTripCounts },
    employeeRestDaysRemaining: { ...initialCycleState.employeeRestDaysRemaining }
  };

  console.log(`\n🔄 [TOKYO CYCLE] Initial state:`);
  console.log(`  Next departing team: ${cycleState.nextDepartingTeam}`);
  console.log(`  Employee trip counts:`, JSON.stringify(cycleState.employeeTripCounts));
  console.log(`  Employee rest days remaining:`, JSON.stringify(cycleState.employeeRestDaysRemaining));

  const allShifts: any[] = [];
  const currentDate = new Date(startDate);
  let isFirstDay = true;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Advance rest day counters at the START of each day (except the first day)
    // This ensures that restDaysRemaining=2 means "rest for the next 2 days"
    if (!isFirstDay) {
      advanceRestDayCounters(cycleState);
    }
    isFirstDay = false;

    // Check if this date is suspended (運休)
    if (suspendedSet.has(dateStr)) {
      console.log(`\n🚫 [SUSPENDED] ${dateStr} is a suspended date - pausing cycle`);
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const departingTeam = cycleState.nextDepartingTeam;
    console.log(`\n📆 [TOKYO CYCLE] Processing date: ${dateStr}, departing team: ${departingTeam}`);

    // Determine which employees are on rest today
    const restingEmployees = new Set<string>();
    for (const [empId, restDays] of Object.entries(cycleState.employeeRestDaysRemaining)) {
      if (restDays > 0) {
        restingEmployees.add(empId);
        console.log(`  💤 [REST] ${empId} has ${restDays} rest day(s) remaining`);
      }
    }

    // Assign business pairs for this date
    const usedEmployees: Set<string> = new Set();

    for (const pair of pairs) {
      const businessGroup = pair.outbound.業務グループ || pair.outbound.business_group || '';

      // Determine which team should handle this pair today
      // If fixedTeam is set, only assign on days when that team is departing
      const pairTeam: 'Galaxy' | 'Aube' = pair.fixedTeam ?? departingTeam;

      // Skip this pair if it's fixed to a different team than today's departing team
      if (pair.fixedTeam && pair.fixedTeam !== departingTeam) {
        console.log(`  ⏭️ Skipping ${pair.baseName} (fixed to ${pair.fixedTeam}, today is ${departingTeam})`);
        continue;
      }

      console.log(`\n  📋 ${dateStr} - ${pair.baseName} (team: ${pairTeam})`);

      // Select employees from the departing team
      const selectedEmployees = selectEmployeesForTeam(
        employees,
        pairTeam,
        pair.requiredPeople,
        businessGroup,
        usedEmployees,
        employeeSkillMatrix,
        rollCallProtectionCount,
        restingEmployees
      );

      if (selectedEmployees.length === 0) {
        console.log(`  ❌ No eligible employees found for ${pair.baseName}`);
        continue;
      }

      console.log(`  ✅ Selected: ${selectedEmployees.map(e => e.name || e.氏名 || e.従業員名).join(', ')}`);

      const pairSetId = `ROUNDTRIP_${pair.baseName}_${dateStr}_${pairTeam}`;

      // Day 2 date (return leg)
      const day2Date = new Date(currentDate);
      day2Date.setDate(day2Date.getDate() + 1);

      selectedEmployees.forEach(employee => {
        const empId = getEmpId(employee);

        // Day 1: Outbound (today) - same employee
        const day1Shift = {
          date: new Date(currentDate),
          employee_id: empId,
          business_name: pair.outbound.業務名 || pair.outbound.business_name,
          business_master_id: pair.outbound.業務id || pair.outbound.business_id || pair.outbound.id,
          location: pair.outbound.営業所 || pair.outbound.location,
          multi_day_set_id: pairSetId,
          multi_day_info: {
            day: 1,
            total_days: 2,
            direction: 'outbound',
            team: pairTeam,
            pair_name: pair.baseName,
            required_people: pair.requiredPeople
          }
        };

        // Day 2: Return (next day) - same employee
        const day2Shift = {
          date: day2Date,
          employee_id: empId,
          business_name: pair.return.業務名 || pair.return.business_name,
          business_master_id: pair.return.業務id || pair.return.business_id || pair.return.id,
          location: pair.return.営業所 || pair.return.location,
          multi_day_set_id: pairSetId,
          multi_day_info: {
            day: 2,
            total_days: 2,
            direction: 'return',
            team: pairTeam,
            pair_name: pair.baseName,
            required_people: pair.requiredPeople
          }
        };

        allShifts.push(day1Shift, day2Shift);

        // Update trip count for this employee
        updateTripCount(cycleState, empId);
      });
    }

    // Alternate departing team for next active day
    cycleState.nextDepartingTeam = departingTeam === 'Galaxy' ? 'Aube' : 'Galaxy';
    console.log(`  🔄 [CYCLE] Next departing team: ${cycleState.nextDepartingTeam}`);

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return allShifts;
}

/**
 * Update trip count for an employee and schedule rest if needed
 */
function updateTripCount(cycleState: TokyoCycleState, empId: string): void {
  const currentTripCount = cycleState.employeeTripCounts[empId] ?? 0;
  const newTripCount = currentTripCount + 1;
  console.log(`  📊 [CYCLE] ${empId}: tripCount ${currentTripCount} → ${newTripCount}`);

  if (newTripCount >= 4) {
    // Completed 4 trips - schedule 2 rest days
    // Set to 3 because advanceRestDayCounters is called at START of next day:
    //   day+1: 3→2 (rest), day+2: 2→1 (rest), day+3: 1→0 (work resumes)
    cycleState.employeeTripCounts[empId] = 0;
    cycleState.employeeRestDaysRemaining[empId] = 3;
    console.log(`  🛌 [CYCLE] ${empId}: completed 4 trips, scheduling 2 rest days`);
  } else {
    cycleState.employeeTripCounts[empId] = newTripCount;
  }
}

/**
 * Advance rest day counters for all employees (called once per day)
 */
function advanceRestDayCounters(cycleState: TokyoCycleState): void {
  for (const empId of Object.keys(cycleState.employeeRestDaysRemaining)) {
    if (cycleState.employeeRestDaysRemaining[empId] > 0) {
      cycleState.employeeRestDaysRemaining[empId]--;
      console.log(`  📅 [REST] ${empId}: rest days remaining → ${cycleState.employeeRestDaysRemaining[empId]}`);
    }
  }
}

/**
 * Legacy assignment for non-Tokyo locations (date parity based)
 */
function getDepartingTeamByDate(date: Date): 'Galaxy' | 'Aube' {
  const dayOfMonth = date.getDate();
  return dayOfMonth % 2 === 1 ? 'Galaxy' : 'Aube';
}

function assignBusinessPairLegacy(
  pair: BusinessPair,
  employees: Employee[],
  startDate: Date,
  usedEmployees: Set<string>,
  batchId: string,
  employeeSkillMatrix?: Map<string, Set<string>>,
  rollCallProtectionCount?: number
): any[] {
  const team = getDepartingTeamByDate(startDate);
  const businessGroup = pair.outbound.業務グループ || pair.outbound.business_group || '';

  console.log(`\n📅 ${startDate.toISOString().split('T')[0]} - ${pair.baseName}`);
  console.log(`  🚌 Departing team: ${team}`);

  const selectedEmployees = selectEmployeesForTeam(
    employees,
    team,
    pair.requiredPeople,
    businessGroup,
    usedEmployees,
    employeeSkillMatrix,
    rollCallProtectionCount
  );

  if (selectedEmployees.length === 0) {
    console.log(`  ❌ No eligible employees found`);
    return [];
  }

  console.log(`  ✅ Selected: ${selectedEmployees.map(e => e.name || e.氏名 || e.従業員名).join(', ')}`);

  const shifts: any[] = [];
  const pairSetId = `ROUNDTRIP_${pair.baseName}_${startDate.toISOString().split('T')[0]}_${team}`;

  selectedEmployees.forEach(employee => {
    const empId = getEmpId(employee);

    const day1Shift = {
      date: startDate,
      employee_id: empId,
      business_name: pair.outbound.業務名 || pair.outbound.business_name,
      business_master_id: pair.outbound.業務id || pair.outbound.business_id || pair.outbound.id,
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

    const day2Date = new Date(startDate);
    day2Date.setDate(day2Date.getDate() + 1);

    const day2Shift = {
      date: day2Date,
      employee_id: empId,
      business_name: pair.return.業務名 || pair.return.business_name,
      business_master_id: pair.return.業務id || pair.return.business_id || pair.return.id,
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

  return shifts;
}
