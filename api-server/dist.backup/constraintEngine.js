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
exports.constraintEngine = exports.ConstraintEngine = void 0;
var uuid_1 = require("uuid");
var constraintManager_1 = require("./constraintManager");
var ConstraintEngine = /** @class */ (function () {
    function ConstraintEngine() {
        this.constraints = [];
        this.violationLog = [];
        this.cachedConstraintGroups = null;
    }
    /**
     * 指定拠点の制約条件を読み込み
     */
    ConstraintEngine.prototype.loadConstraints = function (location) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, allConstraints, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('🔄 [CONSTRAINT] Loading constraints for location:', location);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        if (!location) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, constraintManager_1.ConstraintManager.getActiveConstraintsByLocation(location)];
                    case 2:
                        _a.constraints = _b.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, constraintManager_1.ConstraintManager.getAllConstraints()];
                    case 4:
                        allConstraints = _b.sent();
                        this.constraints = allConstraints.filter(function (c) { return c.is_active; });
                        _b.label = 5;
                    case 5:
                        console.log('✅ [CONSTRAINT] Loaded constraints:', this.constraints.length);
                        console.log('📋 [CONSTRAINT] Constraint summary:', this.getConstraintSummary());
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _b.sent();
                        console.error('❌ [CONSTRAINT] Failed to load constraints:', error_1);
                        // テーブルが存在しない場合は空の配列で続行
                        this.constraints = [];
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * シフト配置の制約チェック（制約グループを含む）
     */
    ConstraintEngine.prototype.validateShiftAssignment = function (employee, proposedShift, existingShifts) {
        return __awaiter(this, void 0, void 0, function () {
            var violations, canProceed, _i, _a, constraint, violation;
            return __generator(this, function (_b) {
                violations = [];
                canProceed = true;
                console.log("\uD83D\uDD0D [VALIDATE] Checking constraints for ".concat(employee.name, " on ").concat(proposedShift.shift_date));
                // 優先度順に制約をチェック
                for (_i = 0, _a = this.constraints; _i < _a.length; _i++) {
                    constraint = _a[_i];
                    violation = this.checkConstraint(constraint, employee, proposedShift, existingShifts);
                    if (violation) {
                        violations.push(violation);
                        console.log("\u26A0\uFE0F [VALIDATE] Constraint violation: ".concat(violation.violation_description));
                        // 必須制約(priority_level = 0, enforcement_level = 'mandatory')の場合は配置不可
                        if (constraint.priority_level === 0 && constraint.enforcement_level === 'mandatory') {
                            canProceed = false;
                            console.log("\uD83D\uDEAB [VALIDATE] Mandatory constraint violated, assignment blocked");
                            break;
                        }
                    }
                }
                // 制約グループの評価は現在無効化（constraintGroupEvaluatorが存在しないため）
                // TODO: 制約グループ機能を実装する場合は、constraintGroupEvaluator.tsを作成してください
                return [2 /*return*/, {
                        canProceed: canProceed,
                        violations: violations
                    }];
            });
        });
    };
    /**
     * 個別制約のチェック
     */
    ConstraintEngine.prototype.checkConstraint = function (constraint, employee, proposedShift, existingShifts) {
        switch (constraint.constraint_type) {
            case 'max_consecutive_days':
                return this.checkMaxConsecutiveDays(constraint, employee, proposedShift, existingShifts);
            case 'min_rest_hours':
                return this.checkMinRestHours(constraint, employee, proposedShift, existingShifts);
            case 'max_weekly_hours':
                return this.checkMaxWeeklyHours(constraint, employee, proposedShift, existingShifts);
            case 'max_monthly_hours':
                return this.checkMaxMonthlyHours(constraint, employee, proposedShift, existingShifts);
            case 'daily_coverage':
                // 日次カバレッジは個別従業員ではなく業務全体でチェック
                return null;
            case 'max_shifts_per_day':
                return this.checkMaxShiftsPerDay(constraint, employee, proposedShift, existingShifts);
            default:
                console.warn("\u26A0\uFE0F [CONSTRAINT] Unknown constraint type: ".concat(constraint.constraint_type));
                return null;
        }
    };
    /**
     * 最大連続出勤日数チェック
     */
    ConstraintEngine.prototype.checkMaxConsecutiveDays = function (constraint, employee, proposedShift, existingShifts) {
        var employeeShifts = existingShifts.filter(function (s) { return s.employee_id === employee.id; });
        var allDates = __spreadArray(__spreadArray([], employeeShifts.map(function (s) { return s.shift_date; }), true), [proposedShift.shift_date], false).sort();
        var consecutiveCount = 1;
        var maxConsecutive = 1;
        for (var i = 1; i < allDates.length; i++) {
            var prevDate = new Date(allDates[i - 1]);
            var currDate = new Date(allDates[i]);
            var dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
            if (dayDiff === 1) {
                consecutiveCount++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
            }
            else {
                consecutiveCount = 1;
            }
        }
        if (maxConsecutive > constraint.constraint_value) {
            return {
                id: (0, uuid_1.v4)(),
                constraint: constraint,
                employee_id: employee.id,
                violation_date: proposedShift.shift_date,
                violation_type: 'max_consecutive_days',
                violation_description: "".concat(employee.name, "\u306E\u9023\u7D9A\u51FA\u52E4\u65E5\u6570\u304C").concat(maxConsecutive, "\u65E5\u3068\u306A\u308A\u3001\u4E0A\u9650").concat(constraint.constraint_value, "\u65E5\u3092\u8D85\u904E"),
                severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
                can_proceed: constraint.enforcement_level !== 'mandatory'
            };
        }
        return null;
    };
    /**
     * 最小休息時間チェック
     */
    ConstraintEngine.prototype.checkMinRestHours = function (constraint, employee, proposedShift, existingShifts) {
        var employeeShifts = existingShifts.filter(function (s) { return s.employee_id === employee.id; });
        var proposedDate = new Date(proposedShift.shift_date);
        // 前日のシフトをチェック
        var previousDay = new Date(proposedDate);
        previousDay.setDate(previousDay.getDate() - 1);
        var previousDayStr = previousDay.toISOString().split('T')[0];
        var previousShift = employeeShifts.find(function (s) { return s.shift_date === previousDayStr; });
        if (previousShift) {
            var previousEndTime = new Date("".concat(previousShift.shift_date, " ").concat(previousShift.end_time));
            var proposedStartTime = new Date("".concat(proposedShift.shift_date, " ").concat(proposedShift.start_time));
            var restHours = (proposedStartTime.getTime() - previousEndTime.getTime()) / (1000 * 60 * 60);
            if (restHours < constraint.constraint_value) {
                return {
                    id: (0, uuid_1.v4)(),
                    constraint: constraint,
                    employee_id: employee.id,
                    violation_date: proposedShift.shift_date,
                    violation_type: 'min_rest_hours',
                    violation_description: "".concat(employee.name, "\u306E\u52E4\u52D9\u9593\u4F11\u606F\u6642\u9593\u304C").concat(restHours.toFixed(1), "\u6642\u9593\u3067\u3001\u6700\u5C0F\u5FC5\u8981\u6642\u9593").concat(constraint.constraint_value, "\u6642\u9593\u3092\u4E0B\u56DE\u308B"),
                    severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
                    can_proceed: constraint.enforcement_level !== 'mandatory'
                };
            }
        }
        return null;
    };
    /**
     * 週間最大労働時間チェック
     */
    ConstraintEngine.prototype.checkMaxWeeklyHours = function (constraint, employee, proposedShift, existingShifts) {
        var proposedDate = new Date(proposedShift.shift_date);
        var weekStart = new Date(proposedDate);
        weekStart.setDate(proposedDate.getDate() - proposedDate.getDay());
        var weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        var weekShifts = existingShifts.filter(function (s) {
            return s.employee_id === employee.id &&
                new Date(s.shift_date) >= weekStart &&
                new Date(s.shift_date) <= weekEnd;
        });
        var totalWeeklyHours = this.calculateShiftHours(weekShifts);
        totalWeeklyHours += this.calculateShiftHours([proposedShift]);
        if (totalWeeklyHours > constraint.constraint_value) {
            return {
                id: (0, uuid_1.v4)(),
                constraint: constraint,
                employee_id: employee.id,
                violation_date: proposedShift.shift_date,
                violation_type: 'max_weekly_hours',
                violation_description: "".concat(employee.name, "\u306E\u9031\u9593\u52B4\u50CD\u6642\u9593\u304C").concat(totalWeeklyHours.toFixed(1), "\u6642\u9593\u3068\u306A\u308A\u3001\u4E0A\u9650").concat(constraint.constraint_value, "\u6642\u9593\u3092\u8D85\u904E"),
                severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
                can_proceed: constraint.enforcement_level !== 'mandatory'
            };
        }
        return null;
    };
    /**
     * 月間最大労働時間チェック
     */
    ConstraintEngine.prototype.checkMaxMonthlyHours = function (constraint, employee, proposedShift, existingShifts) {
        var proposedDate = new Date(proposedShift.shift_date);
        var monthStart = new Date(proposedDate.getFullYear(), proposedDate.getMonth(), 1);
        var monthEnd = new Date(proposedDate.getFullYear(), proposedDate.getMonth() + 1, 0);
        var monthShifts = existingShifts.filter(function (s) {
            return s.employee_id === employee.id &&
                new Date(s.shift_date) >= monthStart &&
                new Date(s.shift_date) <= monthEnd;
        });
        var totalMonthlyHours = this.calculateShiftHours(monthShifts);
        totalMonthlyHours += this.calculateShiftHours([proposedShift]);
        if (totalMonthlyHours > constraint.constraint_value) {
            return {
                id: (0, uuid_1.v4)(),
                constraint: constraint,
                employee_id: employee.id,
                violation_date: proposedShift.shift_date,
                violation_type: 'max_monthly_hours',
                violation_description: "".concat(employee.name, "\u306E\u6708\u9593\u52B4\u50CD\u6642\u9593\u304C").concat(totalMonthlyHours.toFixed(1), "\u6642\u9593\u3068\u306A\u308A\u3001\u4E0A\u9650").concat(constraint.constraint_value, "\u6642\u9593\u3092\u8D85\u904E"),
                severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
                can_proceed: constraint.enforcement_level !== 'mandatory'
            };
        }
        return null;
    };
    /**
     * 1日最大シフト数チェック
     */
    ConstraintEngine.prototype.checkMaxShiftsPerDay = function (constraint, employee, proposedShift, existingShifts) {
        var sameDayShifts = existingShifts.filter(function (s) {
            return s.employee_id === employee.id && s.shift_date === proposedShift.shift_date;
        });
        var totalShiftsForDay = sameDayShifts.length + 1; // +1 for proposed shift
        if (totalShiftsForDay > constraint.constraint_value) {
            return {
                id: (0, uuid_1.v4)(),
                constraint: constraint,
                employee_id: employee.id,
                violation_date: proposedShift.shift_date,
                violation_type: 'max_shifts_per_day',
                violation_description: "".concat(employee.name, "\u306E").concat(proposedShift.shift_date, "\u306E\u30B7\u30D5\u30C8\u6570\u304C").concat(totalShiftsForDay, "\u3068\u306A\u308A\u3001\u4E0A\u9650").concat(constraint.constraint_value, "\u3092\u8D85\u904E"),
                severity_level: constraint.enforcement_level === 'mandatory' ? 'critical' : 'warning',
                can_proceed: constraint.enforcement_level !== 'mandatory'
            };
        }
        return null;
    };
    /**
     * シフトの労働時間を計算
     */
    ConstraintEngine.prototype.calculateShiftHours = function (shifts) {
        return shifts.reduce(function (total, shift) {
            var startTime = new Date("2000-01-01 ".concat(shift.start_time));
            var endTime = new Date("2000-01-01 ".concat(shift.end_time));
            var hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            return total + Math.max(0, hours); // 負の値を避ける
        }, 0);
    };
    /**
     * 制約条件サマリーを取得
     */
    ConstraintEngine.prototype.getConstraintSummary = function () {
        var summary = {
            total: this.constraints.length,
            byCategory: {},
            byEnforcement: {},
            byPriority: {
                mandatory: 0, // priority_level = 0
                high: 0, // priority_level 1-20
                medium: 0, // priority_level 21-50
                low: 0 // priority_level 51-100
            }
        };
        this.constraints.forEach(function (constraint) {
            // カテゴリ別
            summary.byCategory[constraint.constraint_category] =
                (summary.byCategory[constraint.constraint_category] || 0) + 1;
            // 強制レベル別
            summary.byEnforcement[constraint.enforcement_level] =
                (summary.byEnforcement[constraint.enforcement_level] || 0) + 1;
            // 優先度別
            if (constraint.priority_level === 0) {
                summary.byPriority.mandatory++;
            }
            else if (constraint.priority_level <= 20) {
                summary.byPriority.high++;
            }
            else if (constraint.priority_level <= 50) {
                summary.byPriority.medium++;
            }
            else {
                summary.byPriority.low++;
            }
        });
        return summary;
    };
    /**
     * 制約違反をログに記録
     */
    ConstraintEngine.prototype.logViolations = function (violations, batchId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (violations.length === 0)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, constraintManager_1.ConstraintManager.logViolations(violations, batchId)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error('❌ [LOG] Error logging violations:', error_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 制約条件の数を取得
     */
    ConstraintEngine.prototype.getConstraintCount = function () {
        return this.constraints.length;
    };
    /**
     * 有効な制約条件を取得
     */
    ConstraintEngine.prototype.getActiveConstraints = function () {
        return this.constraints.filter(function (c) { return c.is_active; });
    };
    return ConstraintEngine;
}());
exports.ConstraintEngine = ConstraintEngine;
// 制約エンジンのシングルトンインスタンス
exports.constraintEngine = new ConstraintEngine();
