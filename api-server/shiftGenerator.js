"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShifts = generateShifts;
var uuid_1 = require("uuid");
var supabaseClient_1 = require("./supabaseClient");
var constraintEngine_1 = require("./constraintEngine");
// Load skill matrix from database
// Load skill matrix from database
// Now accepts employee objects and uses employee_id (numeric) for querying
function loadSkillMatrixFromDB(employees) {
    return __awaiter(this, void 0, void 0, function () {
        var skillMap, numericEmployeeIds, _a, data, error, idMap_1, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🔍 [DEBUG] loadSkillMatrixFromDB called for', employees.length, 'employees');
                    skillMap = new Map();
                    if (employees.length === 0) {
                        return [2 /*return*/, skillMap];
                    }
                    numericEmployeeIds = employees
                        .map(function (emp) { return emp.employee_id || emp.従業員ID; })
                        .filter(function (id) { return id; });
                    console.log('🔍 [DEBUG] Numeric employee IDs for skill query:', numericEmployeeIds);
                    if (numericEmployeeIds.length === 0) {
                        console.warn('⚠️ No numeric employee_ids found');
                        return [2 /*return*/, skillMap];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabaseClient_1.supabase
                            .from('skill_matrix')
                            .select('employee_id, business_group, skill_level')
                            .in('employee_id', numericEmployeeIds)];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    console.log('🔍 [DEBUG] skill_matrix query result - error:', error, 'data length:', data ? data.length : 'null');
                    if (data && data.length > 0) {
                        console.log('🔍 [DEBUG] skill_matrix first 3 records:', JSON.stringify(data.slice(0, 3), null, 2));
                    }
                    if (error) {
                        console.error('⚠️ Failed to load skill matrix from DB:', error);
                        return [2 /*return*/, skillMap];
                    }
                    if (data) {
                        idMap_1 = new Map();
                        employees.forEach(function (emp) {
                            var numericId = emp.employee_id || emp.従業員ID;
                            var uuid = emp.id || emp.従業員ID || emp.employee_id;
                            if (numericId && uuid) {
                                idMap_1.set(numericId, uuid);
                            }
                        });
                        console.log('🔍 [DEBUG] ID mapping created:', idMap_1.size, 'mappings');
                        data.forEach(function (record) {
                            var numericEmpId = record.employee_id;
                            var uuid = idMap_1.get(numericEmpId);
                            var bizGroup = record.business_group;
                            var skillLevel = record.skill_level;
                            if (!uuid) {
                                console.warn('⚠️ No UUID found for numeric employee_id:', numericEmpId);
                                return;
                            }
                            // Only include skills with valid levels (○ or △)
                            if (skillLevel === '○' || skillLevel === '△' || skillLevel === '経験あり' || skillLevel === '対応可能') {
                                if (!skillMap.has(uuid)) {
                                    skillMap.set(uuid, new Set());
                                }
                                skillMap.get(uuid).add(bizGroup);
                                console.log('✅ Added skill for', uuid, ':', bizGroup);
                            }
                        });
                    }
                    console.log("\uD83D\uDCCA Loaded skill matrix for ".concat(skillMap.size, " employees with skills"));
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _b.sent();
                    console.error('❌ Error loading skill matrix:', err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, skillMap];
            }
        });
    });
}
// Load business history from database
function loadBusinessHistoryFromDB() {
    return __awaiter(this, void 0, void 0, function () {
        var history, _a, data, error, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🔍 [DEBUG] loadBusinessHistoryFromDB called');
                    history = new Map();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabaseClient_1.supabase
                            .from('employee_business_history')
                            .select('employee_id, business_id')];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('⚠️ Failed to load business history from DB:', error);
                        return [2 /*return*/, history];
                    }
                    if (data) {
                        data.forEach(function (record) {
                            var empId = record.employee_id;
                            var bizId = record.business_id;
                            if (!history.has(empId)) {
                                history.set(empId, new Set());
                            }
                            history.get(empId).add(bizId);
                        });
                    }
                    console.log("\uD83D\uDCCA Loaded ".concat((data === null || data === void 0 ? void 0 : data.length) || 0, " business history records"));
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _b.sent();
                    console.error('❌ Error loading business history:', err_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, history];
            }
        });
    });
}
// Save business history to database
function saveBusinessHistoryToDB(employeeId, businessId, assignedDate) {
    return __awaiter(this, void 0, void 0, function () {
        var error, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabaseClient_1.supabase
                            .from('employee_business_history')
                            .upsert({
                            employee_id: employeeId,
                            business_id: businessId,
                            last_assigned_date: assignedDate,
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'employee_id,business_id'
                        })];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('⚠️ Failed to save business history:', error);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_3 = _a.sent();
                    console.error('❌ Error saving business history:', err_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Helper function to check if two time ranges overlap
function timeRangesOverlap(start1, end1, start2, end2) {
    var s1 = new Date("2000-01-01T".concat(start1));
    var e1 = new Date("2000-01-01T".concat(end1));
    var s2 = new Date("2000-01-01T".concat(start2));
    var e2 = new Date("2000-01-01T".concat(end2));
    return s1 < e2 && s2 < e1;
}
// Helper function to get employee's current shifts for time overlap check
function getEmployeeShifts(employeeId, shifts) {
    return shifts.filter(function (s) { return s.employee_id === employeeId; });
}
/**
 * Calculate diversity score for employee-business assignment
 * Higher score = better candidate for diversity
 */
function calculateDiversityScore(employee, businessId, employeeBusinessHistory, employeeAssignmentCounts) {
    var empId = employee.id || employee.従業員ID || employee.employee_id;
    var history = employeeBusinessHistory.get(empId) || new Set();
    var currentCount = employeeAssignmentCounts.get(empId) || 0;
    var score = 0;
    // 1. Bonus for not having done this business before (+100 points)
    if (!history.has(businessId)) {
        score += 100;
    }
    // 2. Diversity score: prefer employees with fewer unique businesses
    // Range: 0-100 points (fewer unique businesses = higher score)
    var diversityScore = Math.max(0, 100 - (history.size * 10));
    score += diversityScore;
    // 3. Load balancing: prefer employees with fewer assignments today
    // Range: 0-100 points (fewer assignments = higher score)
    var loadScore = Math.max(0, 100 - (currentCount * 30));
    score += loadScore;
    return score;
}
/**
 * Calculate diversity score for pair business assignment
 */
function calculatePairDiversityScore(employee, businessIds, employeeBusinessHistory, employeeAssignmentCounts) {
    var empId = employee.id || employee.従業員ID || employee.employee_id;
    var history = employeeBusinessHistory.get(empId) || new Set();
    var currentCount = employeeAssignmentCounts.get(empId) || 0;
    var score = 0;
    // 1. Bonus for not having done ANY of these businesses before
    var newBusinessCount = businessIds.filter(function (id) { return !history.has(id); }).length;
    score += newBusinessCount * 50; // 50 points per new business
    // 2. Diversity score
    var diversityScore = Math.max(0, 100 - (history.size * 10));
    score += diversityScore;
    // 3. Load balancing
    var loadScore = Math.max(0, 100 - (currentCount * 30));
    score += loadScore;
    return score;
}
// Helper function to check if a business can be assigned to an employee (time-wise)
function canAssignBusiness(employeeId, business, currentShifts, allBusinessMasters) {
    var employeeShifts = getEmployeeShifts(employeeId, currentShifts);
    var newStart = business.開始時間 || business.start_time || '09:00:00';
    var newEnd = business.終了時間 || business.end_time || '17:00:00';
    var businessName = business.業務名 || business.name || 'Unknown';
    console.log("\uD83D\uDD0D [TIME_CHECK] Checking ".concat(employeeId, " for ").concat(businessName, " (").concat(newStart, "-").concat(newEnd, ")"));
    console.log("\uD83D\uDD0D [TIME_CHECK] Employee has ".concat(employeeShifts.length, " existing shifts:"), employeeShifts.map(function (s) { return "".concat(s.business_group, " (").concat(s.start_time, "-").concat(s.end_time, ")"); }));
    for (var _i = 0, employeeShifts_1 = employeeShifts; _i < employeeShifts_1.length; _i++) {
        var shift = employeeShifts_1[_i];
        console.log("\uD83D\uDD0D [TIME_CHECK] Comparing with existing shift: ".concat(shift.business_group, " (").concat(shift.start_time, "-").concat(shift.end_time, ")"));
        var overlap = timeRangesOverlap(shift.start_time, shift.end_time, newStart, newEnd);
        console.log("\uD83D\uDD0D [TIME_CHECK] Overlap result: ".concat(overlap));
        if (overlap) {
            console.log("\u26A0\uFE0F [TIME_CONFLICT] ".concat(employeeId, " already assigned to ").concat(shift.business_group, " (").concat(shift.start_time, "-").concat(shift.end_time, "), conflicts with ").concat(businessName, " (").concat(newStart, "-").concat(newEnd, ")"));
            return false; // Time conflict
        }
    }
    console.log("\u2705 [TIME_CHECK] No conflict found for ".concat(employeeId, " - ").concat(businessName));
    return true;
}
// Enhanced generateShifts function with multi-assignment support
function generateShiftsForSingleDate(employees, businessMasters, targetDate, pairGroups, location, existingBusinessHistory) {
    return __awaiter(this, void 0, void 0, function () {
        var normalizedTargetDate, sampleEmp, batchId, shifts, violations_1, unassigned_businesses_1, constraintViolations, constraintEngine, employeeBusinessHistory_1, _a, vacationData, vacationError, vacationEmployeeIds_1, allEmployeeIds, _b, employeeDetails, empError, rollCallMap_1, availableEmployees_1, employeeSkillMatrix, employeeAssignmentCounts_1, totalUniqueBusinesses_1, avgDiversity, businessGroups_1, singleBusinesses_2, processedBusinesses_1, businessGroupMap_1, assignedBusinesses, rollCallBusinesses_2, nonRollCallSingles_1, _loop_1, _i, rollCallBusinesses_1, business, _loop_2, groupIndex, _loop_3, _c, singleBusinesses_1, business, assignment_summary, constraint_report, unassignedEmployees_1, isSuccessful, error_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('🚀 Starting enhanced shift generation with multi-assignment for:', targetDate);
                    console.log('👥 Available employees:', employees.length);
                    console.log('🏢 Business masters:', businessMasters.length);
                    console.log('📍 Location:', location);
                    normalizedTargetDate = targetDate && typeof targetDate === 'object' && targetDate !== null && targetDate && 'start' in targetDate
                        ? targetDate.start
                        : targetDate;
                    console.log('🔍 [DEBUG] targetDate:', targetDate, '-> normalized:', normalizedTargetDate);
                    // Debug: Check employee data structure
                    if (employees.length > 0) {
                        sampleEmp = employees[0];
                        console.log('🔍 [DEBUG] Sample employee keys:', Object.keys(sampleEmp));
                        console.log('🔍 [DEBUG] Sample roll_call fields:', {
                            roll_call_capable: sampleEmp.roll_call_capable,
                            roll_call_duty: sampleEmp.roll_call_duty,
                            name: sampleEmp.name || sampleEmp.名前
                        });
                    }
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 23, , 24]);
                    batchId = (0, uuid_1.v4)();
                    shifts = [];
                    violations_1 = [];
                    unassigned_businesses_1 = [];
                    constraintViolations = [];
                    constraintEngine = new constraintEngine_1.ConstraintEngine();
                    return [4 /*yield*/, constraintEngine.loadConstraints(location)];
                case 2:
                    _d.sent();
                    // Load business history from DB if not provided
                    console.log('🔍 [DEBUG] existingBusinessHistory:', existingBusinessHistory);
                    if (!existingBusinessHistory) return [3 /*break*/, 3];
                    console.log('🔍 [DEBUG] Using existing business history');
                    employeeBusinessHistory_1 = existingBusinessHistory;
                    console.log('📚 Using provided business history');
                    return [3 /*break*/, 5];
                case 3:
                    console.log('🔍 [DEBUG] Loading business history from DB');
                    return [4 /*yield*/, loadBusinessHistoryFromDB()];
                case 4:
                    employeeBusinessHistory_1 = _d.sent();
                    console.log('📚 Loaded business history from DB:', employeeBusinessHistory_1.size, 'employees');
                    _d.label = 5;
                case 5:
                    console.log('📋 Loaded constraints:', constraintEngine.getConstraintCount());
                    return [4 /*yield*/, supabaseClient_1.supabase
                            .from("vacation_masters")
                            .select("employee_id")
                            .eq("vacation_date", normalizedTargetDate)];
                case 6:
                    _a = _d.sent(), vacationData = _a.data, vacationError = _a.error;
                    vacationEmployeeIds_1 = new Set();
                    if (!vacationError && vacationData) {
                        vacationData.forEach(function (v) { return vacationEmployeeIds_1.add(v.employee_id); });
                        console.log("🏖️ Employees on vacation:", vacationEmployeeIds_1.size, "IDs:", Array.from(vacationEmployeeIds_1));
                    }
                    else if (vacationError) {
                        console.warn("⚠️ Failed to load vacation data:", vacationError.message);
                    }
                    // Enrich employees data with roll_call information from DB
                    console.log('🔍 [DEBUG] Enriching employees data with roll_call information...');
                    allEmployeeIds = employees.map(function (emp) { return emp.id || emp.従業員ID || emp.employee_id; });
                    return [4 /*yield*/, supabaseClient_1.supabase
                            .from('employees')
                            .select('employee_id, roll_call_capable, roll_call_duty')
                            .in('employee_id', allEmployeeIds)];
                case 7:
                    _b = _d.sent(), employeeDetails = _b.data, empError = _b.error;
                    rollCallMap_1 = new Map();
                    console.log('🔍 [DEBUG] Employee details query result:', { empError: empError, count: employeeDetails === null || employeeDetails === void 0 ? void 0 : employeeDetails.length });
                    if (!empError && employeeDetails) {
                        console.log('🔍 [DEBUG] Sample employee detail:', employeeDetails[0]);
                        employeeDetails.forEach(function (emp) {
                            rollCallMap_1.set(emp.employee_id, {
                                roll_call_capable: emp.roll_call_capable,
                                roll_call_duty: emp.roll_call_duty
                            });
                        });
                        console.log('📊 Enriched roll_call data for', rollCallMap_1.size, 'employees');
                        console.log('🔍 [DEBUG] Roll call capable employees:', Array.from(rollCallMap_1.entries()).filter(function (_a) {
                            var id = _a[0], info = _a[1];
                            return info.roll_call_capable;
                        }).map(function (_a) {
                            var id = _a[0], info = _a[1];
                            return id;
                        }));
                    }
                    else if (empError) {
                        console.error('❌ Failed to load employee details:', empError);
                    }
                    // Enrich employees with roll_call information
                    employees.forEach(function (emp) {
                        var empId = emp.id || emp.従業員ID || emp.employee_id;
                        var rollCallInfo = rollCallMap_1.get(empId);
                        if (rollCallInfo) {
                            emp.roll_call_capable = rollCallInfo.roll_call_capable;
                            emp.roll_call_duty = rollCallInfo.roll_call_duty;
                        }
                    });
                    availableEmployees_1 = employees.filter(function (emp) {
                        var empId = emp.id || emp.従業員ID || emp.employee_id;
                        return !vacationEmployeeIds_1.has(empId);
                    });
                    console.log('👥 Available employees (after vacation filter):', availableEmployees_1.length);
                    return [4 /*yield*/, loadSkillMatrixFromDB(availableEmployees_1)];
                case 8:
                    employeeSkillMatrix = _d.sent();
                    console.log('📊 Skill matrix loaded for', employeeSkillMatrix.size, 'employees');
                    if (availableEmployees_1.length === 0) {
                        console.error('❌ No employees available after filtering vacations');
                        return [2 /*return*/, {
                                success: false,
                                batch_id: batchId,
                                shifts: [],
                                violations: ['従業員が全員休暇中です'],
                                generation_time: 0,
                                unassigned_businesses: businessMasters.map(function (b) { return b.業務名 || b.name || 'Unknown'; }),
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
                            }];
                    }
                    if (!businessMasters || businessMasters.length === 0) {
                        console.error('❌ No business masters provided');
                        return [2 /*return*/, {
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
                                    total_employees: availableEmployees_1.length,
                                    unassigned_employees: 0
                                },
                                assigned_count: 0,
                                total_businesses: 0,
                                constraint_violations: [],
                                constraint_report: null
                            }];
                    }
                    employeeAssignmentCounts_1 = new Map();
                    availableEmployees_1.forEach(function (emp) {
                        var empId = emp.id || emp.従業員ID || emp.employee_id;
                        employeeAssignmentCounts_1.set(empId, 0);
                    });
                    // Initialize history for employees who don't have one yet
                    availableEmployees_1.forEach(function (emp) {
                        var empId = emp.id || emp.従業員ID || emp.employee_id;
                        if (!employeeBusinessHistory_1.has(empId)) {
                            employeeBusinessHistory_1.set(empId, new Set());
                        }
                    });
                    totalUniqueBusinesses_1 = 0;
                    employeeBusinessHistory_1.forEach(function (history, empId) {
                        totalUniqueBusinesses_1 += history.size;
                    });
                    if (employeeBusinessHistory_1.size > 0) {
                        avgDiversity = totalUniqueBusinesses_1 / employeeBusinessHistory_1.size;
                        console.log("\uD83D\uDCCA Average business diversity: ".concat(avgDiversity.toFixed(2), " unique businesses per employee"));
                    }
                    businessGroups_1 = [];
                    singleBusinesses_2 = [];
                    processedBusinesses_1 = new Set();
                    businessGroupMap_1 = new Map();
                    businessMasters.forEach(function (business) {
                        var businessGroup = business.業務グループ || business.business_group;
                        if (businessGroup) {
                            if (!businessGroupMap_1.has(businessGroup)) {
                                businessGroupMap_1.set(businessGroup, []);
                            }
                            businessGroupMap_1.get(businessGroup).push(business);
                        }
                    });
                    // Then, process each business
                    businessMasters.forEach(function (business) {
                        var businessId = business.業務id || business.id || business.業務名 || business.name;
                        if (processedBusinesses_1.has(businessId))
                            return;
                        // Check if this business has a pair ID
                        var pairBusinessId = business.ペア業務id || business.pair_business_id;
                        if (pairBusinessId && pairGroups && pairGroups[pairBusinessId]) {
                            var pairBusinesses = pairGroups[pairBusinessId];
                            if (pairBusinesses.length > 1) {
                                businessGroups_1.push(pairBusinesses);
                                pairBusinesses.forEach(function (pb) {
                                    var pbId = pb.業務id || pb.id || pb.業務名 || pb.name;
                                    processedBusinesses_1.add(pbId);
                                });
                                console.log("\uD83D\uDD17 Paired businesses (by ID): ".concat(pairBusinesses.map(function (pb) { return pb.業務名 || pb.name; }).join(' ↔ ')));
                                return;
                            }
                        }
                        // Check if this business has a business group with multiple businesses
                        var businessGroup = business.業務グループ || business.business_group;
                        if (businessGroup && businessGroupMap_1.has(businessGroup)) {
                            var groupBusinesses = businessGroupMap_1.get(businessGroup);
                            if (groupBusinesses.length > 1) {
                                // Check if any business in this group is already processed
                                var alreadyProcessed = groupBusinesses.some(function (gb) {
                                    var gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
                                    return processedBusinesses_1.has(gbId);
                                });
                                if (!alreadyProcessed) {
                                    // Filter out businesses that have time conflicts with each other
                                    var nonConflictingGroups = [];
                                    var tempProcessed = new Set();
                                    for (var _i = 0, groupBusinesses_1 = groupBusinesses; _i < groupBusinesses_1.length; _i++) {
                                        var gb = groupBusinesses_1[_i];
                                        var gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
                                        if (tempProcessed.has(gbId))
                                            continue;
                                        // Start a new group with this business
                                        var group = [gb];
                                        tempProcessed.add(gbId);
                                        var gbStart = gb.開始時間 || gb.start_time || '09:00:00';
                                        var gbEnd = gb.終了時間 || gb.end_time || '17:00:00';
                                        // Find other businesses that don't conflict with ANY business in the current group
                                        for (var _a = 0, groupBusinesses_2 = groupBusinesses; _a < groupBusinesses_2.length; _a++) {
                                            var other = groupBusinesses_2[_a];
                                            var otherId = other.業務id || other.id || other.業務名 || other.name;
                                            if (tempProcessed.has(otherId))
                                                continue;
                                            var otherStart = other.開始時間 || other.start_time || '09:00:00';
                                            var otherEnd = other.終了時間 || other.end_time || '17:00:00';
                                            // Check if times don't overlap with ANY business in the current group
                                            var hasConflict = false;
                                            for (var _b = 0, group_1 = group; _b < group_1.length; _b++) {
                                                var groupBusiness = group_1[_b];
                                                var groupStart = groupBusiness.開始時間 || groupBusiness.start_time || '09:00:00';
                                                var groupEnd = groupBusiness.終了時間 || groupBusiness.end_time || '17:00:00';
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
                                            singleBusinesses_2.push(gb);
                                            processedBusinesses_1.add(gbId);
                                        }
                                    }
                                    // Add non-conflicting groups
                                    nonConflictingGroups.forEach(function (group) {
                                        businessGroups_1.push(group);
                                        group.forEach(function (gb) {
                                            var gbId = gb.業務id || gb.id || gb.業務名 || gb.name;
                                            processedBusinesses_1.add(gbId);
                                        });
                                        console.log("\uD83D\uDD17 Paired businesses (by group, non-conflicting): ".concat(group.map(function (gb) { return gb.業務名 || gb.name; }).join(' ↔ ')));
                                    });
                                    return;
                                }
                                else {
                                    // Already processed as part of a group
                                    processedBusinesses_1.add(businessId);
                                    return;
                                }
                            }
                        }
                        // Single business (no pair)
                        singleBusinesses_2.push(business);
                        processedBusinesses_1.add(businessId);
                    });
                    console.log("\uD83D\uDCCA Business groups: ".concat(businessGroups_1.length, " pairs, ").concat(singleBusinesses_2.length, " singles"));
                    console.log('📊 Business groups detail:');
                    businessGroups_1.forEach(function (group, index) {
                        console.log("  Group ".concat(index + 1, ":"), group.map(function (b) {
                            var name = b.業務名 || b.name;
                            var start = b.開始時間 || b.start_time || '09:00:00';
                            var end = b.終了時間 || b.end_time || '17:00:00';
                            return "".concat(name, " (").concat(start, "-").concat(end, ")");
                        }));
                    });
                    console.log('📊 Single businesses:', singleBusinesses_2.map(function (b) {
                        var name = b.業務名 || b.name;
                        var start = b.開始時間 || b.start_time || '09:00:00';
                        var end = b.終了時間 || b.end_time || '17:00:00';
                        return "".concat(name, " (").concat(start, "-").concat(end, ")");
                    }));
                    assignedBusinesses = 0;
                    // PHASE 0: Assign roll call businesses first (highest priority)
                    console.log('\n📞 PHASE 0: Assigning roll call businesses...');
                    rollCallBusinesses_2 = [];
                    nonRollCallSingles_1 = [];
                    singleBusinesses_2.forEach(function (business) {
                        var businessName = business.業務名 || business.name || '';
                        var businessGroup = business.業務グループ || business.business_group || '';
                        // Check if this is a roll call business
                        if (businessName.includes('点呼') || businessGroup.includes('点呼')) {
                            rollCallBusinesses_2.push(business);
                        }
                        else {
                            nonRollCallSingles_1.push(business);
                        }
                    });
                    console.log("\uD83D\uDCDE Found ".concat(rollCallBusinesses_2.length, " roll call businesses"));
                    _loop_1 = function (business) {
                        var businessName, businessId, rollCallCapableEmployees, candidateEmployees, sortedEmployees, selectedEmployee, _e, sortedEmployees_1, emp, empId, currentCount, businessGroup, employeeSkills, empId, empName, shift, history_1;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    businessName = business.業務名 || business.name || 'Unknown';
                                    businessId = business.業務id || business.id || 'unknown';
                                    console.log("\uD83D\uDD04 Processing roll call business: ".concat(businessName));
                                    rollCallCapableEmployees = availableEmployees_1.filter(function (emp) {
                                        return emp.roll_call_capable === true || emp.roll_call_duty === '1';
                                    });
                                    console.log("\uD83D\uDC65 Found ".concat(rollCallCapableEmployees.length, " roll call capable employees"));
                                    if (rollCallCapableEmployees.length === 0) {
                                        unassigned_businesses_1.push(businessName);
                                        violations_1.push("".concat(businessName, ": \u70B9\u547C\u5BFE\u5FDC\u53EF\u80FD\u306A\u5F93\u696D\u54E1\u304C\u3044\u307E\u305B\u3093"));
                                        console.error("\u274C No roll call capable employees available for ".concat(businessName));
                                        return [2 /*return*/, "continue"];
                                    }
                                    candidateEmployees = rollCallCapableEmployees;
                                    sortedEmployees = candidateEmployees.sort(function (a, b) {
                                        var aScore = calculateDiversityScore(a, businessId, employeeBusinessHistory_1, employeeAssignmentCounts_1);
                                        var bScore = calculateDiversityScore(b, businessId, employeeBusinessHistory_1, employeeAssignmentCounts_1);
                                        return bScore - aScore; // Higher score first
                                    });
                                    selectedEmployee = null;
                                    for (_e = 0, sortedEmployees_1 = sortedEmployees; _e < sortedEmployees_1.length; _e++) {
                                        emp = sortedEmployees_1[_e];
                                        empId = emp.id || emp.従業員ID || emp.employee_id;
                                        currentCount = employeeAssignmentCounts_1.get(empId) || 0;
                                        // Skip if employee already has 3 assignments
                                        if (currentCount >= 3)
                                            continue;
                                        businessGroup = business.業務グループ || business.business_group || '';
                                        employeeSkills = employeeSkillMatrix.get(empId) || new Set();
                                        if (!employeeSkills.has(businessGroup)) {
                                            console.log("\u26D4 ".concat(emp.name || empId, " does not have skill for ").concat(businessGroup));
                                            continue;
                                        }
                                        // Check time conflicts
                                        if (!canAssignBusiness(empId, business, shifts, businessMasters))
                                            continue;
                                        selectedEmployee = emp;
                                        break;
                                    }
                                    if (!selectedEmployee) return [3 /*break*/, 2];
                                    empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
                                    empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
                                    shift = {
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
                                        location: location,
                                        multi_day_set_id: undefined,
                                        multi_day_info: undefined
                                    };
                                    shifts.push(shift);
                                    assignedBusinesses++;
                                    employeeAssignmentCounts_1.set(empId, (employeeAssignmentCounts_1.get(empId) || 0) + 1);
                                    history_1 = employeeBusinessHistory_1.get(empId) || new Set();
                                    history_1.add(businessId);
                                    employeeBusinessHistory_1.set(empId, history_1);
                                    // Save to database
                                    return [4 /*yield*/, saveBusinessHistoryToDB(empId, businessId, targetDate)];
                                case 1:
                                    // Save to database
                                    _f.sent();
                                    console.log("\u2705 Assigned roll call business to ".concat(empName, " (").concat(empId, ", unique businesses: ").concat(history_1.size, ")"));
                                    return [3 /*break*/, 3];
                                case 2:
                                    unassigned_businesses_1.push(businessName);
                                    violations_1.push("".concat(businessName, ": \u70B9\u547C\u5BFE\u5FDC\u53EF\u80FD\u306A\u5F93\u696D\u54E1\u304C\u3044\u307E\u305B\u3093"));
                                    console.log("\u26A0\uFE0F No available employee for roll call business: ".concat(businessName));
                                    _f.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, rollCallBusinesses_1 = rollCallBusinesses_2;
                    _d.label = 9;
                case 9:
                    if (!(_i < rollCallBusinesses_1.length)) return [3 /*break*/, 12];
                    business = rollCallBusinesses_1[_i];
                    return [5 /*yield**/, _loop_1(business)];
                case 10:
                    _d.sent();
                    _d.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 9];
                case 12:
                    // Update singleBusinesses to exclude roll call businesses
                    singleBusinesses_2.length = 0;
                    singleBusinesses_2.push.apply(singleBusinesses_2, nonRollCallSingles_1);
                    // PHASE 1: Assign pair businesses (priority)
                    console.log('\n🔗 PHASE 1: Assigning pair businesses...');
                    _loop_2 = function (groupIndex) {
                        var businessGroup, selectedEmployee, minViolations, businessIds, sortedEmployees, _g, sortedEmployees_2, emp, empId, currentCount, isRollCallGroup, hasAllSkills, _h, businessGroup_1, business, businessGroup_5, employeeSkills, hasTimeConflict, _j, businessGroup_2, business, i, j, business1, business2, start1, end1, start2, end2, name1, name2, totalViolations, canAssign, _k, businessGroup_3, business, testShift, validationResult, empId, empName, history_2, _l, businessGroup_4, business, businessName, businessId, shift;
                        return __generator(this, function (_m) {
                            switch (_m.label) {
                                case 0:
                                    businessGroup = businessGroups_1[groupIndex];
                                    console.log("\uD83D\uDD04 Processing pair group ".concat(groupIndex + 1, ":"), businessGroup.map(function (b) { return b.業務名 || b.name; }));
                                    selectedEmployee = null;
                                    minViolations = Infinity;
                                    businessIds = businessGroup.map(function (b) { return b.業務id || b.id || 'unknown'; });
                                    sortedEmployees = availableEmployees_1.sort(function (a, b) {
                                        var aScore = calculatePairDiversityScore(a, businessIds, employeeBusinessHistory_1, employeeAssignmentCounts_1);
                                        var bScore = calculatePairDiversityScore(b, businessIds, employeeBusinessHistory_1, employeeAssignmentCounts_1);
                                        return bScore - aScore; // Higher score first
                                    });
                                    _g = 0, sortedEmployees_2 = sortedEmployees;
                                    _m.label = 1;
                                case 1:
                                    if (!(_g < sortedEmployees_2.length)) return [3 /*break*/, 7];
                                    emp = sortedEmployees_2[_g];
                                    empId = emp.id || emp.従業員ID || emp.employee_id;
                                    currentCount = employeeAssignmentCounts_1.get(empId) || 0;
                                    // Skip if employee already has 3 assignments
                                    if (currentCount >= 3)
                                        return [3 /*break*/, 6];
                                    isRollCallGroup = businessGroup.some(function (b) {
                                        var bizName = b.業務名 || b.name || '';
                                        var bizGroup = b.業務グループ || b.business_group || '';
                                        return bizName.includes('点呼') || bizGroup.includes('点呼');
                                    });
                                    // If this is a roll call business, check roll_call_capable
                                    if (isRollCallGroup) {
                                        if (emp.roll_call_capable !== true && emp.roll_call_duty !== '1') {
                                            console.log("\u26D4 ".concat(emp.name || empId, " does not have roll call capability"));
                                            return [3 /*break*/, 6];
                                        }
                                    }
                                    hasAllSkills = true;
                                    for (_h = 0, businessGroup_1 = businessGroup; _h < businessGroup_1.length; _h++) {
                                        business = businessGroup_1[_h];
                                        businessGroup_5 = business.業務グループ || business.business_group || '';
                                        employeeSkills = employeeSkillMatrix.get(empId) || new Set();
                                        if (!employeeSkills.has(businessGroup_5)) {
                                            console.log("\u26D4 ".concat(emp.name || empId, " does not have skill for ").concat(businessGroup_5));
                                            hasAllSkills = false;
                                            break;
                                        }
                                    }
                                    if (!hasAllSkills)
                                        return [3 /*break*/, 6];
                                    hasTimeConflict = false;
                                    for (_j = 0, businessGroup_2 = businessGroup; _j < businessGroup_2.length; _j++) {
                                        business = businessGroup_2[_j];
                                        if (!canAssignBusiness(empId, business, shifts, businessMasters)) {
                                            hasTimeConflict = true;
                                            break;
                                        }
                                    }
                                    if (hasTimeConflict)
                                        return [3 /*break*/, 6];
                                    // Check time conflicts within the business group itself
                                    if (businessGroup.length > 1) {
                                        for (i = 0; i < businessGroup.length; i++) {
                                            for (j = i + 1; j < businessGroup.length; j++) {
                                                business1 = businessGroup[i];
                                                business2 = businessGroup[j];
                                                start1 = business1.開始時間 || business1.start_time || '09:00:00';
                                                end1 = business1.終了時間 || business1.end_time || '17:00:00';
                                                start2 = business2.開始時間 || business2.start_time || '09:00:00';
                                                end2 = business2.終了時間 || business2.end_time || '17:00:00';
                                                if (timeRangesOverlap(start1, end1, start2, end2)) {
                                                    name1 = business1.業務名 || business1.name || 'Unknown';
                                                    name2 = business2.業務名 || business2.name || 'Unknown';
                                                    console.log("\u26A0\uFE0F [GROUP_CONFLICT] Cannot assign ".concat(empId, " to business group: ").concat(name1, " (").concat(start1, "-").concat(end1, ") conflicts with ").concat(name2, " (").concat(start2, "-").concat(end2, ")"));
                                                    hasTimeConflict = true;
                                                    break;
                                                }
                                            }
                                            if (hasTimeConflict)
                                                break;
                                        }
                                    }
                                    if (hasTimeConflict)
                                        return [3 /*break*/, 6];
                                    totalViolations = 0;
                                    canAssign = true;
                                    _k = 0, businessGroup_3 = businessGroup;
                                    _m.label = 2;
                                case 2:
                                    if (!(_k < businessGroup_3.length)) return [3 /*break*/, 5];
                                    business = businessGroup_3[_k];
                                    testShift = {
                                        shift_date: targetDate,
                                        employee_id: empId,
                                        business_group: business.業務グループ || 'default',
                                        shift_type: 'regular',
                                        start_time: business.開始時間 || '09:00:00',
                                        end_time: business.終了時間 || '17:00:00',
                                        status: 'scheduled'
                                    };
                                    return [4 /*yield*/, constraintEngine.validateShiftAssignment({
                                            id: empId,
                                            name: emp.name || emp.氏名 || '名前不明',
                                            location: emp.location || emp.拠点 || location || '',
                                            employee_id: empId
                                        }, testShift, shifts)];
                                case 3:
                                    validationResult = _m.sent();
                                    if (!validationResult.canProceed) {
                                        canAssign = false;
                                        return [3 /*break*/, 5];
                                    }
                                    totalViolations += validationResult.violations.length;
                                    _m.label = 4;
                                case 4:
                                    _k++;
                                    return [3 /*break*/, 2];
                                case 5:
                                    if (canAssign && totalViolations < minViolations) {
                                        selectedEmployee = emp;
                                        minViolations = totalViolations;
                                        if (totalViolations === 0) {
                                            return [3 /*break*/, 7]; // Found perfect match
                                        }
                                    }
                                    _m.label = 6;
                                case 6:
                                    _g++;
                                    return [3 /*break*/, 1];
                                case 7:
                                    if (!selectedEmployee) return [3 /*break*/, 12];
                                    empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
                                    empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
                                    history_2 = employeeBusinessHistory_1.get(empId) || new Set();
                                    _l = 0, businessGroup_4 = businessGroup;
                                    _m.label = 8;
                                case 8:
                                    if (!(_l < businessGroup_4.length)) return [3 /*break*/, 11];
                                    business = businessGroup_4[_l];
                                    businessName = business.業務名 || business.name || "Business_".concat(groupIndex);
                                    businessId = business.業務id || business.id || "business_".concat(groupIndex);
                                    shift = {
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
                                        location: location,
                                        multi_day_set_id: undefined,
                                        multi_day_info: undefined
                                    };
                                    shifts.push(shift);
                                    assignedBusinesses++;
                                    // Update business history for diversity tracking
                                    history_2.add(businessId);
                                    // Save to database
                                    return [4 /*yield*/, saveBusinessHistoryToDB(empId, businessId, targetDate)];
                                case 9:
                                    // Save to database
                                    _m.sent();
                                    console.log("\u2705 Assigned ".concat(empName, " (").concat(empId, ") to ").concat(businessName));
                                    _m.label = 10;
                                case 10:
                                    _l++;
                                    return [3 /*break*/, 8];
                                case 11:
                                    // Update assignment count and history
                                    employeeAssignmentCounts_1.set(empId, (employeeAssignmentCounts_1.get(empId) || 0) + businessGroup.length);
                                    employeeBusinessHistory_1.set(empId, history_2);
                                    console.log("\uD83D\uDCCA ".concat(empName, " now has ").concat(employeeAssignmentCounts_1.get(empId), " assignments, ").concat(history_2.size, " unique businesses"));
                                    return [3 /*break*/, 13];
                                case 12:
                                    // No available employee for this pair
                                    businessGroup.forEach(function (business) {
                                        var businessName = business.業務名 || business.name || "Business_".concat(groupIndex);
                                        unassigned_businesses_1.push(businessName);
                                        violations_1.push("".concat(businessName, ": \u30A2\u30B5\u30A4\u30F3\u53EF\u80FD\u306A\u5F93\u696D\u54E1\u304C\u3044\u307E\u305B\u3093"));
                                        console.log("\u26A0\uFE0F No available employee for ".concat(businessName));
                                    });
                                    _m.label = 13;
                                case 13: return [2 /*return*/];
                            }
                        });
                    };
                    groupIndex = 0;
                    _d.label = 13;
                case 13:
                    if (!(groupIndex < businessGroups_1.length)) return [3 /*break*/, 16];
                    return [5 /*yield**/, _loop_2(groupIndex)];
                case 14:
                    _d.sent();
                    _d.label = 15;
                case 15:
                    groupIndex++;
                    return [3 /*break*/, 13];
                case 16:
                    // PHASE 2: Assign single businesses (balance-aware)
                    console.log('\n📋 PHASE 2: Assigning single businesses (balance-aware)...');
                    _loop_3 = function (business) {
                        var businessName, businessId, selectedEmployee, minViolations, sortedEmployees, _o, sortedEmployees_3, emp, empId, currentCount, businessGroup, employeeSkills, testShift, validationResult, totalViolations, empId, empName, shift, history_3;
                        return __generator(this, function (_p) {
                            switch (_p.label) {
                                case 0:
                                    businessName = business.業務名 || business.name || 'Unknown';
                                    businessId = business.業務id || business.id || 'unknown';
                                    console.log("\uD83D\uDD04 Processing single business: ".concat(businessName));
                                    selectedEmployee = null;
                                    minViolations = Infinity;
                                    sortedEmployees = availableEmployees_1.sort(function (a, b) {
                                        var aId = a.id || a.従業員ID || a.employee_id;
                                        var bId = b.id || b.従業員ID || b.employee_id;
                                        // Check if employee has done this business before
                                        var aHistory = employeeBusinessHistory_1.get(aId) || new Set();
                                        var bHistory = employeeBusinessHistory_1.get(bId) || new Set();
                                        var aHasDoneBusiness = aHistory.has(businessId);
                                        var bHasDoneBusiness = bHistory.has(businessId);
                                        // Prioritize employees who haven't done this business
                                        if (!aHasDoneBusiness && bHasDoneBusiness)
                                            return -1;
                                        if (aHasDoneBusiness && !bHasDoneBusiness)
                                            return 1;
                                        // If both have or haven't done it, prioritize by diversity (fewer unique businesses)
                                        var aDiversity = aHistory.size;
                                        var bDiversity = bHistory.size;
                                        if (aDiversity !== bDiversity) {
                                            return aDiversity - bDiversity; // Prefer less diverse employees to balance
                                        }
                                        // Finally, sort by assignment count
                                        return (employeeAssignmentCounts_1.get(aId) || 0) - (employeeAssignmentCounts_1.get(bId) || 0);
                                    });
                                    _o = 0, sortedEmployees_3 = sortedEmployees;
                                    _p.label = 1;
                                case 1:
                                    if (!(_o < sortedEmployees_3.length)) return [3 /*break*/, 4];
                                    emp = sortedEmployees_3[_o];
                                    empId = emp.id || emp.従業員ID || emp.employee_id;
                                    currentCount = employeeAssignmentCounts_1.get(empId) || 0;
                                    // Skip if employee already has 3 assignments
                                    if (currentCount >= 3)
                                        return [3 /*break*/, 3];
                                    businessGroup = business.業務グループ || business.business_group || '';
                                    employeeSkills = employeeSkillMatrix.get(empId) || new Set();
                                    if (!employeeSkills.has(businessGroup)) {
                                        console.log("\u26D4 ".concat(emp.name || empId, " does not have skill for ").concat(businessGroup));
                                        return [3 /*break*/, 3];
                                    }
                                    // Check time conflicts
                                    if (!canAssignBusiness(empId, business, shifts, businessMasters))
                                        return [3 /*break*/, 3];
                                    testShift = {
                                        shift_date: targetDate,
                                        employee_id: empId,
                                        business_group: business.業務グループ || 'default',
                                        shift_type: 'regular',
                                        start_time: business.開始時間 || '09:00:00',
                                        end_time: business.終了時間 || '17:00:00',
                                        status: 'scheduled'
                                    };
                                    return [4 /*yield*/, constraintEngine.validateShiftAssignment({
                                            id: empId,
                                            name: emp.name || emp.氏名 || '名前不明',
                                            location: emp.location || emp.拠点 || location || '',
                                            employee_id: empId
                                        }, testShift, shifts)];
                                case 2:
                                    validationResult = _p.sent();
                                    if (!validationResult.canProceed)
                                        return [3 /*break*/, 3];
                                    totalViolations = validationResult.violations.length;
                                    if (totalViolations < minViolations) {
                                        selectedEmployee = emp;
                                        minViolations = totalViolations;
                                        if (totalViolations === 0) {
                                            return [3 /*break*/, 4]; // Found perfect match
                                        }
                                    }
                                    _p.label = 3;
                                case 3:
                                    _o++;
                                    return [3 /*break*/, 1];
                                case 4:
                                    if (!selectedEmployee) return [3 /*break*/, 6];
                                    empId = selectedEmployee.id || selectedEmployee.従業員ID || selectedEmployee.employee_id;
                                    empName = selectedEmployee.name || selectedEmployee.氏名 || '名前不明';
                                    shift = {
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
                                        location: location,
                                        multi_day_set_id: undefined,
                                        multi_day_info: undefined
                                    };
                                    shifts.push(shift);
                                    assignedBusinesses++;
                                    // Update assignment count
                                    employeeAssignmentCounts_1.set(empId, (employeeAssignmentCounts_1.get(empId) || 0) + 1);
                                    history_3 = employeeBusinessHistory_1.get(empId) || new Set();
                                    history_3.add(businessId);
                                    employeeBusinessHistory_1.set(empId, history_3);
                                    // Save to database
                                    return [4 /*yield*/, saveBusinessHistoryToDB(empId, businessId, targetDate)];
                                case 5:
                                    // Save to database
                                    _p.sent();
                                    console.log("\u2705 Assigned ".concat(empName, " (").concat(empId, ") to ").concat(businessName, " (total: ").concat(employeeAssignmentCounts_1.get(empId), ", unique businesses: ").concat(history_3.size, ")"));
                                    return [3 /*break*/, 7];
                                case 6:
                                    unassigned_businesses_1.push(businessName);
                                    violations_1.push("".concat(businessName, ": \u30A2\u30B5\u30A4\u30F3\u53EF\u80FD\u306A\u5F93\u696D\u54E1\u304C\u3044\u307E\u305B\u3093"));
                                    console.log("\u26A0\uFE0F No available employee for ".concat(businessName));
                                    _p.label = 7;
                                case 7: return [2 /*return*/];
                            }
                        });
                    };
                    _c = 0, singleBusinesses_1 = singleBusinesses_2;
                    _d.label = 17;
                case 17:
                    if (!(_c < singleBusinesses_1.length)) return [3 /*break*/, 20];
                    business = singleBusinesses_1[_c];
                    return [5 /*yield**/, _loop_3(business)];
                case 18:
                    _d.sent();
                    _d.label = 19;
                case 19:
                    _c++;
                    return [3 /*break*/, 17];
                case 20:
                    if (!(constraintViolations.length > 0)) return [3 /*break*/, 22];
                    return [4 /*yield*/, constraintEngine.logViolations(constraintViolations, batchId)];
                case 21:
                    _d.sent();
                    _d.label = 22;
                case 22:
                    assignment_summary = {
                        total_businesses: businessMasters.length,
                        assigned_businesses: assignedBusinesses,
                        unassigned_businesses: unassigned_businesses_1.length,
                        total_employees: availableEmployees_1.length
                    };
                    constraint_report = {
                        total_constraints: constraintEngine.getConstraintCount(),
                        constraint_violations: constraintViolations.length,
                        mandatory_violations: constraintViolations.filter(function (v) { return v.severity_level === 'critical'; }).length,
                        warning_violations: constraintViolations.filter(function (v) { return v.severity_level === 'warning'; }).length
                    };
                    console.log('\n📊 Generation Summary:');
                    console.log('✅ Assigned businesses:', assignedBusinesses);
                    console.log('⚠️ Unassigned businesses:', unassigned_businesses_1.length);
                    console.log('⚠️ Violations:', violations_1.length);
                    // Log employee assignment distribution
                    console.log('\n👥 Employee Assignment Distribution:');
                    unassignedEmployees_1 = [];
                    employeeAssignmentCounts_1.forEach(function (count, empId) {
                        var emp = availableEmployees_1.find(function (e) { return (e.id || e.従業員ID || e.employee_id) === empId; });
                        var empName = emp ? (emp.name || emp.氏名 || '名前不明') : '不明';
                        if (count > 0) {
                            console.log("  ".concat(empName, " (").concat(empId, "): ").concat(count, " \u696D\u52D9"));
                        }
                        else {
                            // アサインされなかった従業員を非勤務者リストに追加
                            unassignedEmployees_1.push({
                                employee_id: empId,
                                name: empName,
                                shift_date: targetDate,
                                status: 'unassigned'
                            });
                            console.log("  ".concat(empName, " (").concat(empId, "): \u975E\u52E4\u52D9"));
                        }
                    });
                    console.log("\n\uD83D\uDCCB Unassigned employees: ".concat(unassignedEmployees_1.length));
                    isSuccessful = shifts.length > 0;
                    return [2 /*return*/, {
                            success: isSuccessful,
                            batch_id: batchId,
                            shifts: shifts,
                            violations: violations_1,
                            generation_time: 0.1,
                            unassigned_businesses: unassigned_businesses_1,
                            unassigned_employees: unassignedEmployees_1,
                            assignment_summary: __assign(__assign({}, assignment_summary), { unassigned_employees: unassignedEmployees_1.length }),
                            assigned_count: assignedBusinesses,
                            total_businesses: businessMasters.length,
                            constraint_violations: constraintViolations,
                            constraint_report: constraint_report,
                            business_history: employeeBusinessHistory_1
                        }];
                case 23:
                    error_1 = _d.sent();
                    console.error('❌ Error in generateShifts:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            batch_id: (0, uuid_1.v4)(),
                            shifts: [],
                            violations: ["\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error')],
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
                        }];
                case 24: return [2 /*return*/];
            }
        });
    });
}
// ... (rest of the file remains the same)
/**
 * Multi-day shift generation wrapper
 * This function handles multiple dates and maintains business history across days
 */
function generateShifts(employees, businessMasters, dateRange, pairGroups, location) {
    return __awaiter(this, void 0, void 0, function () {
        var dates, cumulativeBusinessHistory, batchId, employeeSkillMatrix, _a, preprocessMultiDayBusinesses, filterOutMultiDayBusinesses, multiDayResult, regularBusinessMasters, allShifts, allViolations, allUnassignedBusinesses, allUnassignedEmployees, allConstraintViolations, totalAssignedCount, totalBusinessCount, _loop_4, _i, dates_1, targetDate, isSuccessful;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🔴 [DEBUG] generateShifts function called!');
                    console.log('🔴 [DEBUG] employees:', employees.length);
                    console.log('🔴 [DEBUG] businessMasters:', businessMasters.length);
                    console.log('🔴 [DEBUG] dateRange:', dateRange);
                    console.log('🚀 Starting multi-day shift generation');
                    dates = Array.isArray(dateRange) ? dateRange : [dateRange];
                    console.log("\uD83D\uDCC5 Processing ".concat(dates.length, " date(s):"), dates);
                    return [4 /*yield*/, loadBusinessHistoryFromDB()];
                case 1:
                    cumulativeBusinessHistory = _b.sent();
                    console.log("\uD83D\uDCDA Loaded initial business history for ".concat(cumulativeBusinessHistory.size, " employees"));
                    batchId = (0, uuid_1.v4)();
                    return [4 /*yield*/, loadSkillMatrixFromDB(employees)];
                case 2:
                    employeeSkillMatrix = _b.sent();
                    _a = require('./multi-day-integration-patch'), preprocessMultiDayBusinesses = _a.preprocessMultiDayBusinesses, filterOutMultiDayBusinesses = _a.filterOutMultiDayBusinesses;
                    return [4 /*yield*/, preprocessMultiDayBusinesses(businessMasters, dates, employees, batchId, employeeSkillMatrix, location)];
                case 3:
                    multiDayResult = _b.sent();
                    regularBusinessMasters = filterOutMultiDayBusinesses(businessMasters, multiDayResult.processedBusinessIds);
                    console.log("\n\uD83D\uDCCA Business split: ".concat(multiDayResult.processedBusinessIds.size, " multi-day, ").concat(regularBusinessMasters.length, " regular"));
                    allShifts = __spreadArray([], multiDayResult.multiDayShifts, true);
                    allViolations = [];
                    allUnassignedBusinesses = [];
                    allUnassignedEmployees = [];
                    allConstraintViolations = [];
                    totalAssignedCount = multiDayResult.multiDayShifts.length;
                    totalBusinessCount = multiDayResult.processedBusinessIds.size;
                    _loop_4 = function (targetDate) {
                        var assignedEmployeesOnThisDate, availableEmployeesForThisDate, result;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    console.log("\n\uD83D\uDCC5 Processing date: ".concat(targetDate));
                                    assignedEmployeesOnThisDate = multiDayResult.assignedEmployeesByDate.get(targetDate) || new Set();
                                    availableEmployeesForThisDate = employees.filter(function (emp) {
                                        var empId = emp.id || emp.従業員ID || emp.employee_id;
                                        return !assignedEmployeesOnThisDate.has(empId);
                                    });
                                    console.log("  Available employees: ".concat(availableEmployeesForThisDate.length, " (").concat(assignedEmployeesOnThisDate.size, " assigned to multi-day)"));
                                    return [4 /*yield*/, generateShiftsForSingleDate(availableEmployeesForThisDate, regularBusinessMasters, targetDate, pairGroups, location, cumulativeBusinessHistory)];
                                case 1:
                                    result = _c.sent();
                                    // Accumulate results
                                    allShifts.push.apply(allShifts, result.shifts);
                                    allViolations.push.apply(allViolations, result.violations);
                                    if (result.unassigned_businesses) {
                                        allUnassignedBusinesses.push.apply(allUnassignedBusinesses, result.unassigned_businesses);
                                    }
                                    if (result.unassigned_employees) {
                                        allUnassignedEmployees.push.apply(allUnassignedEmployees, result.unassigned_employees);
                                    }
                                    if (result.constraint_violations) {
                                        allConstraintViolations.push.apply(allConstraintViolations, result.constraint_violations);
                                    }
                                    totalAssignedCount += result.assigned_count || 0;
                                    totalBusinessCount += result.total_businesses || 0;
                                    // Update cumulative business history with new assignments
                                    if (result.business_history) {
                                        result.business_history.forEach(function (businesses, empId) {
                                            var existing = cumulativeBusinessHistory.get(empId) || new Set();
                                            businesses.forEach(function (biz) { return existing.add(biz); });
                                            cumulativeBusinessHistory.set(empId, existing);
                                        });
                                    }
                                    console.log("\u2705 ".concat(targetDate, ": Generated ").concat(result.shifts.length, " shifts"));
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, dates_1 = dates;
                    _b.label = 4;
                case 4:
                    if (!(_i < dates_1.length)) return [3 /*break*/, 7];
                    targetDate = dates_1[_i];
                    return [5 /*yield**/, _loop_4(targetDate)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    console.log("\n\uD83C\uDF89 Multi-day generation complete: ".concat(allShifts.length, " total shifts across ").concat(dates.length, " day(s)"));
                    isSuccessful = allShifts.length > 0;
                    // batchId already defined at the top of the function
                    return [2 /*return*/, {
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
                        }];
            }
        });
    });
}
