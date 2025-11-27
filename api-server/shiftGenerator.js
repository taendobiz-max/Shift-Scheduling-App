"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShifts = generateShifts;
const uuid_1 = require("uuid");
const supabaseClient_1 = require("./supabaseClient");
const constraintEngine_1 = require("./constraintEngine");
// Load skill matrix from database
function loadSkillMatrixFromDB(employeeIds) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 [DEBUG] loadSkillMatrixFromDB called for', employeeIds.length, 'employees');
        const skillMap = new Map();
        if (employeeIds.length === 0) {
            return skillMap;
        }
        try {
            const { data, error } = yield supabaseClient_1.supabase
                .from('skill_matrix')
                .select('employee_id, business_group, skill_level')
                .in('employee_id', employeeIds);
            if (error) {
                console.error('⚠️ Failed to load skill matrix from DB:', error);
                return skillMap;
            }
            if (data) {
                data.forEach((record) => {
                    const empId = record.employee_id;
                    const bizGroup = record.business_group;
                    const skillLevel = record.skill_level;
                    // Only include skills with valid levels
                    if (skillLevel === '経験あり' || skillLevel === '対応可能') {
                        if (!skillMap.has(empId)) {
                            skillMap.set(empId, new Set());
                        }
                        skillMap.get(empId).add(bizGroup);
                    }
                });
            }
            console.log(`📊 Loaded skill matrix for ${skillMap.size} employees with skills`);
        }
        catch (err) {
            console.error('❌ Error loading skill matrix:', err);
        }
        return skillMap;
    });
}
// Load business history from database
function loadBusinessHistoryFromDB() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 [DEBUG] loadBusinessHistoryFromDB called');
        const history = new Map();
        try {
            const { data, error } = yield supabaseClient_1.supabase
                .from('employee_business_history')
                .select('employee_id, business_id');
            if (error) {
                console.error('⚠️ Failed to load business history from DB:', error);
                return history;
            }
            if (data) {
                data.forEach((record) => {
                    const empId = record.employee_id;
                    const bizId = record.business_id;
                    if (!history.has(empId)) {
                        history.set(empId, new Set());
                    }
                    history.get(empId).add(bizId);
                });
            }
            console.log(`📊 Loaded ${(data === null || data === void 0 ? void 0 : data.length) || 0} business history records`);
        }
        catch (err) {
            console.error('❌ Error loading business history:', err);
        }
        return history;
    });
}
// Save business history to database
function saveBusinessHistoryToDB(employeeId, businessId, assignedDate) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { error } = yield supabaseClient_1.supabase
                .from('employee_business_history')
                .upsert({
                employee_id: employeeId,
                business_id: businessId,
                last_assigned_date: assignedDate,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'employee_id,business_id'
            });
            if (error) {
                console.error('⚠️ Failed to save business history:', error);
            }
        }
        catch (err) {
            console.error('❌ Error saving business history:', err);
        }
    });
}
// Helper function to check if two time ranges overlap
function timeRangesOverlap(start1, end1, start2, end2) {
    const s1 = new Date(`2000-01-01T${start1}`);
    const e1 = new Date(`2000-01-01T${end1}`);
    const s2 = new Date(`2000-01-01T${start2}`);
    const e2 = new Date(`2000-01-01T${end2}`);
    return s1 < e2 && s2 < e1;
}
// Helper function to get employee's current shifts for time overlap check
function getEmployeeShifts(employeeId, shifts) {
    return shifts.filter(s => s.employee_id === employeeId);
}
/**
 * Calculate diversity score for employee-business assignment
 * Higher score = better candidate for diversity
 */
function calculateDiversityScore(employee, businessId, employeeBusinessHistory, employeeAssignmentCounts) {
    const empId = employee.id || employee.従業員ID || employee.employee_id;
    const history = employeeBusinessHistory.get(empId) || new Set();
    const currentCount = employeeAssignmentCounts.get(empId) || 0;
    let score = 0;
    // 1. Bonus for not having done this business before (+100 points)
    if (!history.has(businessId)) {
        score += 100;
    }
    // 2. Diversity score: prefer employees with fewer unique businesses
    // Range: 0-100 points (fewer unique businesses = higher score)
    const diversityScore = Math.max(0, 100 - (history.size * 10));
    score += diversityScore;
    // 3. Load balancing: prefer employees with fewer assignments today
    // Range: 0-100 points (fewer assignments = higher score)
    const loadScore = Math.max(0, 100 - (currentCount * 30));
    score += loadScore;
    return score;
}
/**
 * Calculate diversity score for pair business assignment
 */
function calculatePairDiversityScore(employee, businessIds, employeeBusinessHistory, employeeAssignmentCounts) {
    const empId = employee.id || employee.従業員ID || employee.employee_id;
    const history = employeeBusinessHistory.get(empId) || new Set();
    const currentCount = employeeAssignmentCounts.get(empId) || 0;
    let score = 0;
    // 1. Bonus for not having done ANY of these businesses before
    const newBusinessCount = businessIds.filter(id => !history.has(id)).length;
    score += newBusinessCount * 50; // 50 points per new business
    // 2. Diversity score
    const diversityScore = Math.max(0, 100 - (history.size * 10));
    score += diversityScore;
    // 3. Load balancing
    const loadScore = Math.max(0, 100 - (currentCount * 30));
    score += loadScore;
    return score;
}
// Helper function to check if a business can be assigned to an employee (time-wise)
function canAssignBusiness(employeeId, business, currentShifts, allBusinessMasters) {
    const employeeShifts = getEmployeeShifts(employeeId, currentShifts);
    const newStart = business.開始時間 || business.start_time || '09:00:00';
    const newEnd = business.終了時間 || business.end_time || '17:00:00';
    const businessName = business.業務名 || business.name || 'Unknown';
    console.log(`🔍 [TIME_CHECK] Checking ${employeeId} for ${businessName} (${newStart}-${newEnd})`);
    console.log(`🔍 [TIME_CHECK] Employee has ${employeeShifts.length} existing shifts:`, employeeShifts.map(s => `${s.business_group} (${s.start_time}-${s.end_time})`));
    for (const shift of employeeShifts) {
        console.log(`🔍 [TIME_CHECK] Comparing with existing shift: ${shift.business_group} (${shift.start_time}-${shift.end_time})`);
        const overlap = timeRangesOverlap(shift.start_time, shift.end_time, newStart, newEnd);
        console.log(`🔍 [TIME_CHECK] Overlap result: ${overlap}`);
        if (overlap) {
            console.log(`⚠️ [TIME_CONFLICT] ${employeeId} already assigned to ${shift.business_group} (${shift.start_time}-${shift.end_time}), conflicts with ${businessName} (${newStart}-${newEnd})`);
            return false; // Time conflict
        }
    }
    console.log(`✅ [TIME_CHECK] No conflict found for ${employeeId} - ${businessName}`);
    return true;
}
// Enhanced generateShifts function with multi-assignment support
function generateShiftsForSingleDate(employees, businessMasters, targetDate, pairGroups, location, existingBusinessHistory) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting enhanced shift generation with multi-assignment for:', targetDate);
        console.log('👥 Available employees:', employees.length);
        console.log('🏢 Business masters:', businessMasters.length);
        console.log('📍 Location:', location);
        // Debug: Check employee data structure
        if (employees.length > 0) {
            const sampleEmp = employees[0];
            console.log('🔍 [DEBUG] Sample employee keys:', Object.keys(sampleEmp));
            console.log('🔍 [DEBUG] Sample roll_call fields:', {
                roll_call_capable: sampleEmp.roll_call_capable,
                roll_call_duty: sampleEmp.roll_call_duty,
                name: sampleEmp.name || sampleEmp.名前
            });
        }
        try {
            const batchId = (0, uuid_1.v4)();
            const shifts = [];
            const violations = [];
            const unassigned_businesses = [];
            const constraintViolations = [];
            // Initialize constraint engine
            const constraintEngine = new constraintEngine_1.ConstraintEngine();
            yield constraintEngine.loadConstraints(location);
            // Load business history from DB if not provided
            console.log('🔍 [DEBUG] existingBusinessHistory:', existingBusinessHistory);
            let employeeBusinessHistory;
            if (existingBusinessHistory) {
                console.log('🔍 [DEBUG] Using existing business history');
                employeeBusinessHistory = existingBusinessHistory;
                console.log('📚 Using provided business history');
            }
            else {
                console.log('🔍 [DEBUG] Loading business history from DB');
                employeeBusinessHistory = yield loadBusinessHistoryFromDB();
                console.log('📚 Loaded business history from DB:', employeeBusinessHistory.size, 'employees');
            }
            console.log('📋 Loaded constraints:', constraintEngine.getConstraintCount());
            // Load vacation data for the target date
            const { data: vacationData, error: vacationError } = yield supabaseClient_1.supabase
                .from("vacation_masters")
                .select("employee_id")
                .eq("vacation_date", targetDate);
            const vacationEmployeeIds = new Set();
            if (!vacationError && vacationData) {
                vacationData.forEach((v) => vacationEmployeeIds.add(v.employee_id));
                console.log("🏖️ Employees on vacation:", vacationEmployeeIds.size, "IDs:", Array.from(vacationEmployeeIds));
            }
            else if (vacationError) {
                console.warn("⚠️ Failed to load vacation data:", vacationError.message);
            }
            // Enrich employees data with roll_call information from DB
            console.log('🔍 [DEBUG] Enriching employees data with roll_call information...');
            const allEmployeeIds = employees.map(emp => emp.id || emp.従業員ID || emp.employee_id);
            const { data: employeeDetails, error: empError } = yield supabaseClient_1.supabase
                .from('employees')
                .select('employee_id, roll_call_capable, roll_call_duty')
                .in('employee_id', allEmployeeIds);
            const rollCallMap = new Map();
            console.log('🔍 [DEBUG] Employee details query result:', { empError, count: employeeDetails === null || employeeDetails === void 0 ? void 0 : employeeDetails.length });
            if (!empError && employeeDetails) {
                console.log('🔍 [DEBUG] Sample employee detail:', employeeDetails[0]);
                employeeDetails.forEach((emp) => {
                    rollCallMap.set(emp.employee_id, {
                        roll_call_capable: emp.roll_call_capable,
                        roll_call_duty: emp.roll_call_duty
                    });
                });
                console.log('📊 Enriched roll_call data for', rollCallMap.size, 'employees');
                console.log('🔍 [DEBUG] Roll call capable employees:', Array.from(rollCallMap.entries()).filter(([id, info]) => info.roll_call_capable).map(([id, info]) => id));
            }
            else if (empError) {
                console.error('❌ Failed to load employee details:', empError);
            }
            // Enrich employees with roll_call information
            employees.forEach(emp => {
                const empId = emp.id || emp.従業員ID || emp.employee_id;
                const rollCallInfo = rollCallMap.get(empId);
                if (rollCallInfo) {
                    emp.roll_call_capable = rollCallInfo.roll_call_capable;
                    emp.roll_call_duty = rollCallInfo.roll_call_duty;
                }
            });
            // Filter out employees on vacation
            const availableEmployees = employees.filter(emp => {
                const empId = emp.id || emp.従業員ID || emp.employee_id;
                return !vacationEmployeeIds.has(empId);
            });
            console.log('👥 Available employees (after vacation filter):', availableEmployees.length);
            // Load skill matrix for available employees
            const employeeIds = availableEmployees.map(emp => emp.id || emp.従業員ID || emp.employee_id).filter(id => id);
            const employeeSkillMatrix = yield loadSkillMatrixFromDB(employeeIds);
            console.log('📊 Skill matrix loaded for', employeeSkillMatrix.size, 'employees');
            if (availableEmployees.length === 0) {
                console.error('❌ No employees available after filtering vacations');
                return {
                    success: false,
                    batch_id: batchId,
                    shifts: [],
                    violations: ['従業員が全員休暇中です'],
                    generation_time: 0,
                    unassigned_businesses: businessMasters.map(b => b.業務名 || b.name || 'Unknown'),
                    assignment_summary: {
                        total_businesses: businessMasters.length,
                        assigned_businesses: 0,
                        unassigned_businesses: businessMasters.length,
                        total_employees: employees.length
                    },
                    assigned_count: 0,
                    total_businesses: businessMasters.length,
                    constraint_violations: [],
                    constraint_report: null
                };
            }
            if (!businessMasters || businessMasters.length === 0) {
                console.error('❌ No business masters provided');
                return {
                    success: false,
                    batch_id: batchId,
                    shifts: [],
                    violations: ['業務マスターデータが見つかりません'],
                    generation_time: 0,
                    unassigned_businesses: [],
                    unassigned_employees: [],
                    assignment_summary: {
                        total_businesses: 0,
                        assigned_businesses: 0,
                        unassigned_businesses: 0,
                        total_employees: availableEmployees.length,
                        unassigned_employees: 0
                    },
                    assigned_count: 0,
                    total_businesses: 0,
                    constraint_violations: [],
                    constraint_report: null
                };
            }
            // Track employee assignment counts
            const employeeAssignmentCounts = new Map();
            availableEmployees.forEach(emp => {
                const empId = emp.id || emp.従業員ID || emp.employee_id;
                employeeAssignmentCounts.set(empId, 0);
            });
            // Initialize history for employees who don't have one yet
            availableEmployees.forEach(emp => {
                const empId = emp.id || emp.従業員ID || emp.employee_id;
                if (!employeeBusinessHistory.has(empId)) {
                    employeeBusinessHistory.set(empId, new Set());
                }
            });
            // Log current diversity status
            let totalUniqueBusinesses = 0;
            employeeBusinessHistory.forEach((history, empId) => {
                totalUniqueBusinesses += history.size;
            });
            if (employeeBusinessHistory.size > 0) {
                const avgDiversity = totalUniqueBusinesses / employeeBusinessHistory.size;
                console.log(`📊 Average business diversity: ${avgDiversity.toFixed(2)} unique businesses per employee`);
            }
            // Group businesses by pair (if they have pair information)
            const businessGroups = [];
            const singleBusinesses = [];
            const processedBusinesses = new Set();
            // First, group by business group (e.g., "309 A便")
            const businessGroupMap = new Map();
            businessMasters.forEach((business) => {
                const businessGroup = business.業務グループ || business.business_group;
                if (businessGroup) {
                    if (!businessGroupMap.has(businessGroup)) {
                        businessGroupMap.set(businessGroup, []);
                    }
                    businessGroupMap.get(businessGroup).push(business);
                }
            });
            // Then, process each business
            businessMasters.forEach((business) => {
                const businessId = business.業務id || business.id || business.業務名 || business.name;
                if (processedBusinesses.has(businessId))
                    return;
                // Check if this business has a pair ID
                const pairBusinessId = business.ペア業務id || business.pair_business_id;
                if (pairBusinessId && pairGroups && pairGroups[pairBusinessId]) {
                    const pairBusinesses = pairGroups[pairBusinessId];
                    if (pairBusinesses.length > 1) {
                        businessGroups.push(pairBusinesses);
                        pairBusinesses.forEach(pb => {
                            const pbId = pb.業務id || pb.id || pb.業務名 || pb.name;
                            processedBusinesses.add(pbId);
                        });
                        console.log(`🔗 Paired businesses (by ID): ${pairBusinesses.map(pb => pb.業務名 || pb.name).join(' ↔ ')}`);
                        return;
                    }
                }
                // Check if this business has a business group with multiple businesses
                const businessGroup = business.業務グループ || business.business_group;
                if (businessGroup && businessGroupMap.has(businessGroup)) {
                    const groupBusinesses = businessGroupMap.get(businessGroup);
                    if (groupBusinesses.length > 1) {
                        // Check if any business in this group is already processed
                        const alreadyProcessed = groupBusinesses.some(gb => {
                            const gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
                            return processedBusinesses.has(gbId);
                        });
                        if (!alreadyProcessed) {
                            // Filter out businesses that have time conflicts with each other
                            const nonConflictingGroups = [];
                            const tempProcessed = new Set();
                            for (const gb of groupBusinesses) {
                                const gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
                                if (tempProcessed.has(gbId))
                                    continue;
                                // Start a new group with this business
                                const group = [gb];
                                tempProcessed.add(gbId);
                                const gbStart = gb.開始時間 || gb.start_time || '09:00:00';
                                const gbEnd = gb.終了時間 || gb.end_time || '17:00:00';
                                // Find other businesses that don't conflict with ANY business in the current group
                                for (const other of groupBusinesses) {
                                    const otherId = other.業務id || other.id || other.業務名 || other.name;
                                    if (tempProcessed.has(otherId))
                                        continue;
                                    const otherStart = other.開始時間 || other.start_time || '09:00:00';
                                    const otherEnd = other.終了時間 || other.end_time || '17:00:00';
                                    // Check if times don't overlap with ANY business in the current group
                                    let hasConflict = false;
                                    for (const groupBusiness of group) {
                                        const groupStart = groupBusiness.開始時間 || groupBusiness.start_time || '09:00:00';
                                        const groupEnd = groupBusiness.終了時間 || groupBusiness.end_time || '17:00:00';
                                        if (timeRangesOverlap(groupStart, groupEnd, otherStart, otherEnd)) {
                                            hasConflict = true;
                                            break;
                                        }
                                    }
                                    if (!hasConflict) {
                                        group.push(other);
                                        tempProcessed.add(otherId);
                                    }
                                }
                                // Add this group if it has more than 1 business
                                if (group.length > 1) {
                                    nonConflictingGroups.push(group);
                                }
                                else {
                                    // Single business, add to singles later
                                    singleBusinesses.push(gb);
                                    processedBusinesses.add(gbId);
                                }
                            }
                            // Add non-conflicting groups
                            nonConflictingGroups.forEach(group => {
                                businessGroups.push(group);
                                group.forEach(gb => {
                                    const gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
                                    processedBusinesses.add(gbId);
                                });
                                console.log(`🔗 Paired businesses (by group, non-conflicting): ${group.map(gb => gb.業務名 || gb.name).join(' ↔ ')}`);
                            });
                            return;
                        }
                        else {
                            // Already processed as part of a group
                            processedBusinesses.add(businessId);
                            return;
                        }
                    }
                }
                // Single business (no pair)
                singleBusinesses.push(business);
                processedBusinesses.add(businessId);
            });
            console.log(`📊 Business groups: ${businessGroups.length} pairs, ${singleBusinesses.length} singles`);
            console.log('📊 Business groups detail:');
            businessGroups.forEach((group, index) => {
                console.log(`  Group ${index + 1}:`, group.map(b => {
                    const name = b.業務名 || b.name;
                    const start = b.開始時間 || b.start_time || '09:00:00';
                    const end = b.終了時間 || b.end_time || '17:00:00';
                    return `${name} (${start}-${end})`;
                }));
            });
            console.log('📊 Single businesses:', singleBusinesses.map(b => {
                const name = b.業務名 || b.name;
                const start = b.開始時間 || b.start_time || '09:00:00';
                const end = b.終了時間 || b.end_time || '17:00:00';
                return `${name} (${start}-${end})`;
            }));
            let assignedBusinesses = 0;
            // PHASE 0: Assign roll call businesses first (highest priority)
            console.log('\n📞 PHASE 0: Assigning roll call businesses...');
            const rollCallBusinesses = [];
            const nonRollCallSingles = [];
            singleBusinesses.forEach(business => {
                const businessName = business.業務名 || business.name || '';
                const businessGroup = business.業務グループ || business.business_group || '';
                // Check if this is a roll call business
                if (businessName.includes('点呼') || businessGroup.includes('点呼')) {
                    rollCallBusinesses.push(business);
                }
                else {
                    nonRollCallSingles.push(business);
                }
            });
            console.log(`📞 Found ${rollCallBusinesses.length} roll call businesses`);
            for (const business of rollCallBusinesses) {
                const businessName = business.業務名 || business.name || 'Unknown';
                const businessId = business.業務id || business.id || 'unknown';
                console.log(`🔄 Processing roll call business: ${businessName}`);
                // Filter employees who are capable of roll call duty
                const rollCallCapableEmployees = availableEmployees.filter(emp => {
                    return emp.roll_call_capable === true || emp.roll_call_duty === '1';
                });
                console.log(`👥 Found ${rollCallCapableEmployees.length} roll call capable employees`);
                if (rollCallCapableEmployees.length === 0) {
                    unassigned_businesses.push(businessName);
                    violations.push(`${businessName}: 点呼対応可能な従業員がいません`);
                    console.error(`❌ No roll call capable employees available for ${businessName}`);
                    continue;
                }
                const candidateEmployees = rollCallCapableEmployees;
                // Sort by diversity score (prioritize employees who haven't done this business)
                const sortedEmployees = candidateEmployees.sort((a, b) => {
                    const aScore = calculateDiversityScore(a, businessId, employeeBusinessHistory, employeeAssignmentCounts);
                    const bScore = calculateDiversityScore(b, businessId, employeeBusinessHistory, employeeAssignmentCounts);
                    return bScore - aScore; // Higher score first
                });
                let selectedEmployee = null;
                for (const emp of sortedEmployees) {
                    const empId = emp.id || emp.従業員ID || emp.employee_id;
                    const currentCount = employeeAssignmentCounts.get(empId) || 0;
                    // Skip if employee already has 3 assignments
                    if (currentCount >= 3)
                        continue;
                    // Check skill matrix - employee must have the required business group skill
                    const businessGroup = business.業務グループ || business.business_group || '';
                    const employeeSkills = employeeSkillMatrix.get(empId) || new Set();
                    if (!employeeSkills.has(businessGroup)) {
                        console.log(`⛔ ${emp.name || empId} does not have skill for ${businessGroup}`);
                        continue;
                    }
                    // Check time conflicts
                    if (!canAssignBusiness(empId, business, shifts, businessMasters))
                        continue;
                    selectedEmployee = emp;
                    break;
                }
                if (selectedEmployee) {
                    const empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
                    const empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
                    const shift = {
                        shift_date: targetDate,
                        date: targetDate,
                        employee_id: empId,
                        employee_name: empName,
                        business_group: business.業務グループ || '点呼',
                        business_name: business.業務名 || business.業務グループ || '点呼',
                        business_master_id: businessId,
                        shift_type: 'regular',
                        start_time: business.開始時間 || '05:00:00',
                        end_time: business.終了時間 || '05:30:00',
                        status: 'scheduled',
                        generation_batch_id: batchId,
                        location: location
                    };
                    shifts.push(shift);
                    assignedBusinesses++;
                    employeeAssignmentCounts.set(empId, (employeeAssignmentCounts.get(empId) || 0) + 1);
                    // Update business history for diversity tracking
                    const history = employeeBusinessHistory.get(empId) || new Set();
                    history.add(businessId);
                    employeeBusinessHistory.set(empId, history);
                    // Save to database
                    yield saveBusinessHistoryToDB(empId, businessId, targetDate);
                    console.log(`✅ Assigned roll call business to ${empName} (${empId}, unique businesses: ${history.size})`);
                }
                else {
                    unassigned_businesses.push(businessName);
                    violations.push(`${businessName}: 点呼対応可能な従業員がいません`);
                    console.log(`⚠️ No available employee for roll call business: ${businessName}`);
                }
            }
            // Update singleBusinesses to exclude roll call businesses
            singleBusinesses.length = 0;
            singleBusinesses.push(...nonRollCallSingles);
            // PHASE 1: Assign pair businesses (priority)
            console.log('\n🔗 PHASE 1: Assigning pair businesses...');
            for (let groupIndex = 0; groupIndex < businessGroups.length; groupIndex++) {
                const businessGroup = businessGroups[groupIndex];
                console.log(`🔄 Processing pair group ${groupIndex + 1}:`, businessGroup.map(b => b.業務名 || b.name));
                let selectedEmployee = null;
                let minViolations = Infinity;
                // Find employee with best diversity score who can handle this pair
                const businessIds = businessGroup.map(b => b.業務id || b.id || 'unknown');
                const sortedEmployees = availableEmployees.sort((a, b) => {
                    const aScore = calculatePairDiversityScore(a, businessIds, employeeBusinessHistory, employeeAssignmentCounts);
                    const bScore = calculatePairDiversityScore(b, businessIds, employeeBusinessHistory, employeeAssignmentCounts);
                    return bScore - aScore; // Higher score first
                });
                for (const emp of sortedEmployees) {
                    const empId = emp.id || emp.従業員ID || emp.employee_id;
                    const currentCount = employeeAssignmentCounts.get(empId) || 0;
                    // Skip if employee already has 3 assignments
                    if (currentCount >= 3)
                        continue;
                    // Check if this is a roll call business group
                    const isRollCallGroup = businessGroup.some(b => {
                        const bizName = b.業務名 || b.name || '';
                        const bizGroup = b.業務グループ || b.business_group || '';
                        return bizName.includes('点呼') || bizGroup.includes('点呼');
                    });
                    // If this is a roll call business, check roll_call_capable
                    if (isRollCallGroup) {
                        if (emp.roll_call_capable !== true && emp.roll_call_duty !== '1') {
                            console.log(`⛔ ${emp.name || empId} does not have roll call capability`);
                            continue;
                        }
                    }
                    // Check skill matrix for each business in the group
                    let hasAllSkills = true;
                    for (const business of businessGroup) {
                        const businessGroup = business.業務グループ || business.business_group || '';
                        const employeeSkills = employeeSkillMatrix.get(empId) || new Set();
                        if (!employeeSkills.has(businessGroup)) {
                            console.log(`⛔ ${emp.name || empId} does not have skill for ${businessGroup}`);
                            hasAllSkills = false;
                            break;
                        }
                    }
                    if (!hasAllSkills)
                        continue;
                    // Check time conflicts with existing shifts
                    let hasTimeConflict = false;
                    for (const business of businessGroup) {
                        if (!canAssignBusiness(empId, business, shifts, businessMasters)) {
                            hasTimeConflict = true;
                            break;
                        }
                    }
                    if (hasTimeConflict)
                        continue;
                    // Check time conflicts within the business group itself
                    if (businessGroup.length > 1) {
                        for (let i = 0; i < businessGroup.length; i++) {
                            for (let j = i + 1; j < businessGroup.length; j++) {
                                const business1 = businessGroup[i];
                                const business2 = businessGroup[j];
                                const start1 = business1.開始時間 || business1.start_time || '09:00:00';
                                const end1 = business1.終了時間 || business1.end_time || '17:00:00';
                                const start2 = business2.開始時間 || business2.start_time || '09:00:00';
                                const end2 = business2.終了時間 || business2.end_time || '17:00:00';
                                if (timeRangesOverlap(start1, end1, start2, end2)) {
                                    const name1 = business1.業務名 || business1.name || 'Unknown';
                                    const name2 = business2.業務名 || business2.name || 'Unknown';
                                    console.log(`⚠️ [GROUP_CONFLICT] Cannot assign ${empId} to business group: ${name1} (${start1}-${end1}) conflicts with ${name2} (${start2}-${end2})`);
                                    hasTimeConflict = true;
                                    break;
                                }
                            }
                            if (hasTimeConflict)
                                break;
                        }
                    }
                    if (hasTimeConflict)
                        continue;
                    // Test constraint validation for each business in the group
                    let totalViolations = 0;
                    let canAssign = true;
                    for (const business of businessGroup) {
                        const testShift = {
                            shift_date: targetDate,
                            employee_id: empId,
                            business_group: business.業務グループ || 'default',
                            shift_type: 'regular',
                            start_time: business.開始時間 || '09:00:00',
                            end_time: business.終了時間 || '17:00:00',
                            status: 'scheduled'
                        };
                        const validationResult = yield constraintEngine.validateShiftAssignment({
                            id: empId,
                            name: emp.name || emp.氏名 || '名前不明',
                            location: emp.location || emp.拠点 || location || '',
                            employee_id: empId
                        }, testShift, shifts);
                        if (!validationResult.canProceed) {
                            canAssign = false;
                            break;
                        }
                        totalViolations += validationResult.violations.length;
                    }
                    if (canAssign && totalViolations < minViolations) {
                        selectedEmployee = emp;
                        minViolations = totalViolations;
                        if (totalViolations === 0) {
                            break; // Found perfect match
                        }
                    }
                }
                if (selectedEmployee) {
                    const empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
                    const empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
                    // Assign all businesses in the pair to this employee
                    const history = employeeBusinessHistory.get(empId) || new Set();
                    for (const business of businessGroup) {
                        const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
                        const businessId = business.業務id || business.id || `business_${groupIndex}`;
                        const shift = {
                            shift_date: targetDate,
                            date: targetDate,
                            employee_id: empId,
                            employee_name: empName,
                            business_group: business.業務グループ || 'default',
                            business_name: business.業務名 || business.業務グループ || 'default',
                            business_master_id: businessId,
                            shift_type: 'regular',
                            start_time: business.開始時間 || '09:00:00',
                            end_time: business.終了時間 || '17:00:00',
                            status: 'scheduled',
                            generation_batch_id: batchId,
                            location: location
                        };
                        shifts.push(shift);
                        assignedBusinesses++;
                        // Update business history for diversity tracking
                        history.add(businessId);
                        // Save to database
                        yield saveBusinessHistoryToDB(empId, businessId, targetDate);
                        console.log(`✅ Assigned ${empName} (${empId}) to ${businessName}`);
                    }
                    // Update assignment count and history
                    employeeAssignmentCounts.set(empId, (employeeAssignmentCounts.get(empId) || 0) + businessGroup.length);
                    employeeBusinessHistory.set(empId, history);
                    console.log(`📊 ${empName} now has ${employeeAssignmentCounts.get(empId)} assignments, ${history.size} unique businesses`);
                }
                else {
                    // No available employee for this pair
                    businessGroup.forEach((business) => {
                        const businessName = business.業務名 || business.name || `Business_${groupIndex}`;
                        unassigned_businesses.push(businessName);
                        violations.push(`${businessName}: アサイン可能な従業員がいません`);
                        console.log(`⚠️ No available employee for ${businessName}`);
                    });
                }
            }
            // PHASE 2: Assign single businesses (balance-aware)
            console.log('\n📋 PHASE 2: Assigning single businesses (balance-aware)...');
            for (const business of singleBusinesses) {
                const businessName = business.業務名 || business.name || 'Unknown';
                const businessId = business.業務id || business.id || 'unknown';
                console.log(`🔄 Processing single business: ${businessName}`);
                let selectedEmployee = null;
                let minViolations = Infinity;
                // Find employee with least assignments who can handle this business
                // Prioritize employees who haven't done this business before (diversity)
                const sortedEmployees = availableEmployees.sort((a, b) => {
                    const aId = a.id || a.従業員ID || a.employee_id;
                    const bId = b.id || b.従業員ID || b.employee_id;
                    // Check if employee has done this business before
                    const aHistory = employeeBusinessHistory.get(aId) || new Set();
                    const bHistory = employeeBusinessHistory.get(bId) || new Set();
                    const aHasDoneBusiness = aHistory.has(businessId);
                    const bHasDoneBusiness = bHistory.has(businessId);
                    // Prioritize employees who haven't done this business
                    if (!aHasDoneBusiness && bHasDoneBusiness)
                        return -1;
                    if (aHasDoneBusiness && !bHasDoneBusiness)
                        return 1;
                    // If both have or haven't done it, prioritize by diversity (fewer unique businesses)
                    const aDiversity = aHistory.size;
                    const bDiversity = bHistory.size;
                    if (aDiversity !== bDiversity) {
                        return aDiversity - bDiversity; // Prefer less diverse employees to balance
                    }
                    // Finally, sort by assignment count
                    return (employeeAssignmentCounts.get(aId) || 0) - (employeeAssignmentCounts.get(bId) || 0);
                });
                for (const emp of sortedEmployees) {
                    const empId = emp.id || emp.従業員ID || emp.employee_id;
                    const currentCount = employeeAssignmentCounts.get(empId) || 0;
                    // Skip if employee already has 3 assignments
                    if (currentCount >= 3)
                        continue;
                    // Check skill matrix - employee must have the required business group skill
                    const businessGroup = business.業務グループ || business.business_group || '';
                    const employeeSkills = employeeSkillMatrix.get(empId) || new Set();
                    if (!employeeSkills.has(businessGroup)) {
                        console.log(`⛔ ${emp.name || empId} does not have skill for ${businessGroup}`);
                        continue;
                    }
                    // Check time conflicts
                    if (!canAssignBusiness(empId, business, shifts, businessMasters))
                        continue;
                    // Test constraint validation
                    const testShift = {
                        shift_date: targetDate,
                        employee_id: empId,
                        business_group: business.業務グループ || 'default',
                        shift_type: 'regular',
                        start_time: business.開始時間 || '09:00:00',
                        end_time: business.終了時間 || '17:00:00',
                        status: 'scheduled'
                    };
                    const validationResult = yield constraintEngine.validateShiftAssignment({
                        id: empId,
                        name: emp.name || emp.氏名 || '名前不明',
                        location: emp.location || emp.拠点 || location || '',
                        employee_id: empId
                    }, testShift, shifts);
                    if (!validationResult.canProceed)
                        continue;
                    const totalViolations = validationResult.violations.length;
                    if (totalViolations < minViolations) {
                        selectedEmployee = emp;
                        minViolations = totalViolations;
                        if (totalViolations === 0) {
                            break; // Found perfect match
                        }
                    }
                }
                if (selectedEmployee) {
                    const empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
                    const empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
                    const shift = {
                        shift_date: targetDate,
                        date: targetDate,
                        employee_id: empId,
                        employee_name: empName,
                        business_group: business.業務グループ || 'default',
                        business_name: business.業務名 || business.業務グループ || 'default',
                        business_master_id: businessId,
                        shift_type: 'regular',
                        start_time: business.開始時間 || '09:00:00',
                        end_time: business.終了時間 || '17:00:00',
                        status: 'scheduled',
                        generation_batch_id: batchId,
                        location: location
                    };
                    shifts.push(shift);
                    assignedBusinesses++;
                    // Update assignment count
                    employeeAssignmentCounts.set(empId, (employeeAssignmentCounts.get(empId) || 0) + 1);
                    // Update business history for diversity tracking
                    const history = employeeBusinessHistory.get(empId) || new Set();
                    history.add(businessId);
                    employeeBusinessHistory.set(empId, history);
                    // Save to database
                    yield saveBusinessHistoryToDB(empId, businessId, targetDate);
                    console.log(`✅ Assigned ${empName} (${empId}) to ${businessName} (total: ${employeeAssignmentCounts.get(empId)}, unique businesses: ${history.size})`);
                }
                else {
                    unassigned_businesses.push(businessName);
                    violations.push(`${businessName}: アサイン可能な従業員がいません`);
                    console.log(`⚠️ No available employee for ${businessName}`);
                }
            }
            // Log constraint violations
            if (constraintViolations.length > 0) {
                yield constraintEngine.logViolations(constraintViolations, batchId);
            }
            // Generate assignment summary
            const assignment_summary = {
                total_businesses: businessMasters.length,
                assigned_businesses: assignedBusinesses,
                unassigned_businesses: unassigned_businesses.length,
                total_employees: availableEmployees.length
            };
            const constraint_report = {
                total_constraints: constraintEngine.getConstraintCount(),
                constraint_violations: constraintViolations.length,
                mandatory_violations: constraintViolations.filter(v => v.severity_level === 'critical').length,
                warning_violations: constraintViolations.filter(v => v.severity_level === 'warning').length
            };
            console.log('\n📊 Generation Summary:');
            console.log('✅ Assigned businesses:', assignedBusinesses);
            console.log('⚠️ Unassigned businesses:', unassigned_businesses.length);
            console.log('⚠️ Violations:', violations.length);
            // Log employee assignment distribution
            console.log('\n👥 Employee Assignment Distribution:');
            const unassignedEmployees = [];
            employeeAssignmentCounts.forEach((count, empId) => {
                const emp = availableEmployees.find(e => (e.id || e.従業員ID || e.employee_id) === empId);
                const empName = emp ? (emp.name || emp.氏名 || '名前不明') : '不明';
                if (count > 0) {
                    console.log(`  ${empName} (${empId}): ${count} 業務`);
                }
                else {
                    // アサインされなかった従業員を非勤務者リストに追加
                    unassignedEmployees.push({
                        employee_id: empId,
                        name: empName,
                        shift_date: targetDate,
                        status: 'unassigned'
                    });
                    console.log(`  ${empName} (${empId}): 非勤務`);
                }
            });
            console.log(`\n📋 Unassigned employees: ${unassignedEmployees.length}`);
            // Consider it successful if we assigned at least some shifts
            const isSuccessful = shifts.length > 0;
            return {
                success: isSuccessful,
                batch_id: batchId,
                shifts,
                violations,
                generation_time: 0.1,
                unassigned_businesses,
                unassigned_employees: unassignedEmployees,
                assignment_summary: Object.assign(Object.assign({}, assignment_summary), { unassigned_employees: unassignedEmployees.length }),
                assigned_count: assignedBusinesses,
                total_businesses: businessMasters.length,
                constraint_violations: constraintViolations,
                constraint_report,
                business_history: employeeBusinessHistory
            };
        }
        catch (error) {
            console.error('❌ Error in generateShifts:', error);
            return {
                success: false,
                batch_id: (0, uuid_1.v4)(),
                shifts: [],
                violations: [`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`],
                generation_time: 0,
                unassigned_businesses: [],
                unassigned_employees: [],
                assignment_summary: {
                    total_businesses: (businessMasters === null || businessMasters === void 0 ? void 0 : businessMasters.length) || 0,
                    assigned_businesses: 0,
                    unassigned_businesses: (businessMasters === null || businessMasters === void 0 ? void 0 : businessMasters.length) || 0,
                    total_employees: (employees === null || employees === void 0 ? void 0 : employees.length) || 0,
                    unassigned_employees: 0
                },
                assigned_count: 0,
                total_businesses: (businessMasters === null || businessMasters === void 0 ? void 0 : businessMasters.length) || 0,
                constraint_violations: [],
                constraint_report: null
            };
        }
    });
}
// ... (rest of the file remains the same)
/**
 * Multi-day shift generation wrapper
 * This function handles multiple dates and maintains business history across days
 */
function generateShifts(employees, businessMasters, dateRange, pairGroups, location) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting multi-day shift generation');
        // Convert single date to array for uniform processing
        const dates = Array.isArray(dateRange) ? dateRange : [dateRange];
        console.log(`📅 Processing ${dates.length} date(s):`, dates);
        // Load initial business history from DB
        const cumulativeBusinessHistory = yield loadBusinessHistoryFromDB();
        console.log(`📚 Loaded initial business history for ${cumulativeBusinessHistory.size} employees`);
        // Accumulate results across all dates
        const allShifts = [];
        const allViolations = [];
        const allUnassignedBusinesses = [];
        const allUnassignedEmployees = [];
        const allConstraintViolations = [];
        let totalAssignedCount = 0;
        let totalBusinessCount = 0;
        // Process each date sequentially
        for (const targetDate of dates) {
            console.log(`\n📅 Processing date: ${targetDate}`);
            const result = yield generateShiftsForSingleDate(employees, businessMasters, targetDate, pairGroups, location, cumulativeBusinessHistory);
            // Accumulate results
            allShifts.push(...result.shifts);
            allViolations.push(...result.violations);
            if (result.unassigned_businesses) {
                allUnassignedBusinesses.push(...result.unassigned_businesses);
            }
            if (result.unassigned_employees) {
                allUnassignedEmployees.push(...result.unassigned_employees);
            }
            if (result.constraint_violations) {
                allConstraintViolations.push(...result.constraint_violations);
            }
            totalAssignedCount += result.assigned_count || 0;
            totalBusinessCount += result.total_businesses || 0;
            // Update cumulative business history with new assignments
            if (result.business_history) {
                result.business_history.forEach((businesses, empId) => {
                    const existing = cumulativeBusinessHistory.get(empId) || new Set();
                    businesses.forEach(biz => existing.add(biz));
                    cumulativeBusinessHistory.set(empId, existing);
                });
            }
            console.log(`✅ ${targetDate}: Generated ${result.shifts.length} shifts`);
        }
        console.log(`\n🎉 Multi-day generation complete: ${allShifts.length} total shifts across ${dates.length} day(s)`);
        // Return aggregated results
        const isSuccessful = allShifts.length > 0;
        const batchId = allShifts.length > 0 ? allShifts[0].generation_batch_id || (0, uuid_1.v4)() : (0, uuid_1.v4)();
        return {
            success: isSuccessful,
            batch_id: batchId,
            shifts: allShifts,
            violations: allViolations,
            generation_time: 0.1,
            unassigned_businesses: allUnassignedBusinesses,
            unassigned_employees: Array.from(new Set(allUnassignedEmployees)),
            assignment_summary: {
                total_businesses: totalBusinessCount,
                assigned_businesses: totalAssignedCount,
                unassigned_businesses: allUnassignedBusinesses.length,
                total_employees: employees.length,
                unassigned_employees: Array.from(new Set(allUnassignedEmployees)).length
            },
            assigned_count: totalAssignedCount,
            total_businesses: totalBusinessCount,
            constraint_violations: allConstraintViolations,
            constraint_report: null,
            business_history: cumulativeBusinessHistory
        };
    });
}
