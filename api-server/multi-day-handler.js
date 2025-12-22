"use strict";
/**
 * 複数日業務のハンドラー
 * generateShiftsForSingleDate関数に統合される
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignMultiDayBusiness = assignMultiDayBusiness;
exports.isMultiDaySetAlreadyAssigned = isMultiDaySetAlreadyAssigned;
exports.hasConflictingShifts = hasConflictingShifts;
var multi_day_business_types_1 = require("./multi-day-business-types");
/**
 * 複数日業務を処理
 * @param business 業務マスタ
 * @param startDate 開始日
 * @param availableEmployees 利用可能な従業員リスト
 * @param batchId バッチID
 * @param employeeSkillMatrix スキルマトリックス
 * @param ruleFilteredEmployees ルールフィルタリング済み従業員
 * @returns 割り当て結果
 */
function assignMultiDayBusiness(business, startDate, availableEmployees, batchId, employeeSkillMatrix, ruleFilteredEmployees) {
    return __awaiter(this, void 0, void 0, function () {
        var config, businessGroup, eligibleEmployees, first, selectedEmployee, empId, empName, shifts, businessSetId, _i, _a, daySchedule, shiftDate, businessName, shift, endDate;
        var _b;
        return __generator(this, function (_c) {
            if (!(0, multi_day_business_types_1.isMultiDayBusiness)(business)) {
                return [2 /*return*/, null];
            }
            config = business.multi_day_config;
            console.log("\n\uD83D\uDD04 [MULTI-DAY] Processing ".concat(business.業務名, " (").concat(config.duration_days, " days)"));
            // 適用日チェック
            if (!(0, multi_day_business_types_1.isApplicableDate)(business, startDate)) {
                console.log("  \u23ED\uFE0F  Skipped: Not applicable for ".concat(startDate));
                return [2 /*return*/, null];
            }
            businessGroup = business.業務グループ || business.business_group;
            console.log("  \uD83D\uDD0D [DEBUG] Filtering for ".concat(business.業務名));
            console.log("    Total employees: ".concat(ruleFilteredEmployees.length));
            console.log("    Required business_group: ".concat(businessGroup));
            console.log("    Required team: ".concat(((_b = config.rotation_rule) === null || _b === void 0 ? void 0 : _b.team_filter) || 'none'));
            eligibleEmployees = ruleFilteredEmployees.filter(function (emp) {
                var _a;
                var empId = emp.employee_id || emp.従業員ID || emp.id;
                var skills = employeeSkillMatrix.get(empId);
                if (!skills || !skills.has(businessGroup)) {
                    return false;
                }
                // 班指定チェック
                if ((_a = config.rotation_rule) === null || _a === void 0 ? void 0 : _a.team_filter) {
                    var empTeam = emp.班 || emp.team || emp.所属班;
                    if (empTeam !== config.rotation_rule.team_filter) {
                        return false;
                    }
                }
                return true;
            });
            console.log("    Eligible after filtering: ".concat(eligibleEmployees.length));
            if (eligibleEmployees.length > 0) {
                first = eligibleEmployees[0];
                console.log("    First eligible: ".concat(first.name || first.氏名, " (\u73ED: ").concat(first.班 || 'none', ")"));
            }
            if (eligibleEmployees.length === 0) {
                console.log("  \u274C No eligible employees for ".concat(business.業務名));
                return [2 /*return*/, null];
            }
            selectedEmployee = eligibleEmployees[0];
            empId = selectedEmployee.employee_id || selectedEmployee.従業員ID || selectedEmployee.id;
            empName = selectedEmployee.name || selectedEmployee.氏名 || selectedEmployee.従業員名;
            console.log("  \u2705 Selected employee: ".concat(empName, " (").concat(empId, ")"));
            shifts = [];
            businessSetId = (0, multi_day_business_types_1.generateMultiDaySetId)(business.業務id, startDate);
            for (_i = 0, _a = config.day_schedules; _i < _a.length; _i++) {
                daySchedule = _a[_i];
                shiftDate = (0, multi_day_business_types_1.addDays)(startDate, daySchedule.date_offset);
                businessName = "".concat(business.業務名).concat(daySchedule.business_name_suffix || '');
                shift = {
                    id: "".concat(businessSetId, "_day").concat(daySchedule.day),
                    date: shiftDate,
                    employee_id: empId,
                    employee_name: empName,
                    business_group: businessGroup,
                    business_name: businessName,
                    business_master_id: business.業務id,
                    shift_type: business.業務タイプ || 'multi_day',
                    start_time: daySchedule.start_time,
                    end_time: daySchedule.end_time,
                    status: 'assigned',
                    generation_batch_id: batchId,
                    location: business.営業所 || business.location,
                    multi_day_set_id: businessSetId,
                    multi_day_info: {
                        day: daySchedule.day,
                        total_days: config.duration_days,
                        direction: daySchedule.direction
                    }
                };
                shifts.push(shift);
                console.log("    Day ".concat(daySchedule.day, ": ").concat(shiftDate, " ").concat(daySchedule.start_time, "-").concat(daySchedule.end_time, " (").concat(daySchedule.direction || 'N/A', ")"));
            }
            endDate = (0, multi_day_business_types_1.addDays)(startDate, config.duration_days - 1);
            return [2 /*return*/, {
                    shifts: shifts,
                    assignedEmployeeId: empId,
                    businessSetId: businessSetId,
                    startDate: startDate,
                    endDate: endDate
                }];
        });
    });
}
/**
 * 複数日業務セットが既に割り当てられているかチェック
 */
function isMultiDaySetAlreadyAssigned(businessSetId, assignedSets) {
    return assignedSets.has(businessSetId);
}
/**
 * 従業員が複数日業務の期間中に他の業務を持っているかチェック
 */
function hasConflictingShifts(employeeId, startDate, endDate, existingShifts) {
    var start = new Date(startDate);
    var end = new Date(endDate);
    return existingShifts.some(function (shift) {
        if (shift.employee_id !== employeeId) {
            return false;
        }
        var shiftDate = new Date(shift.date || shift.shift_date);
        return shiftDate >= start && shiftDate <= end;
    });
}
