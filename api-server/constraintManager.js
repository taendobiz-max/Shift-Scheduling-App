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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstraintManager = void 0;
var supabaseClient_1 = require("./supabaseClient");
var ConstraintManager = /** @class */ (function () {
    function ConstraintManager() {
    }
    /**
     * 全ての制約条件を取得
     */
    ConstraintManager.getAllConstraints = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .select('*')
                                .order('priority_level', { ascending: true })
                                .order('constraint_category', { ascending: true })
                                .order('constraint_name', { ascending: true })];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new Error("\u5236\u7D04\u6761\u4EF6\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        return [2 /*return*/, data || []];
                    case 2:
                        error_1 = _b.sent();
                        console.error('制約条件取得エラー:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 指定拠点の有効な制約条件を取得
     */
    ConstraintManager.getActiveConstraintsByLocation = function (location) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, filteredConstraints, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .select('*')
                                .eq('is_active', true)
                                .order('priority_level', { ascending: true })];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new Error("\u5236\u7D04\u6761\u4EF6\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        filteredConstraints = (data || []).filter(function (constraint) {
                            return constraint.applicable_locations.includes(location) ||
                                constraint.applicable_locations.includes('全拠点');
                        });
                        return [2 /*return*/, filteredConstraints];
                    case 2:
                        error_2 = _b.sent();
                        console.error('制約条件取得エラー:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 制約条件を作成
     */
    ConstraintManager.createConstraint = function (constraintData) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .insert({
                                constraint_name: constraintData.constraint_name,
                                constraint_category: constraintData.constraint_category,
                                constraint_type: constraintData.constraint_type,
                                constraint_value: constraintData.constraint_value,
                                constraint_description: constraintData.constraint_description,
                                applicable_locations: constraintData.applicable_locations,
                                priority_level: constraintData.priority_level,
                                enforcement_level: constraintData.enforcement_level,
                                is_active: constraintData.is_active,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new Error("\u5236\u7D04\u6761\u4EF6\u306E\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        return [2 /*return*/, data];
                    case 2:
                        error_3 = _b.sent();
                        console.error('制約条件作成エラー:', error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 制約条件を更新
     */
    ConstraintManager.updateConstraint = function (id, constraintData) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .update(__assign(__assign({}, constraintData), { updated_at: new Date().toISOString() }))
                                .eq('id', id)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new Error("\u5236\u7D04\u6761\u4EF6\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        return [2 /*return*/, data];
                    case 2:
                        error_4 = _b.sent();
                        console.error('制約条件更新エラー:', error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 制約条件を削除
     */
    ConstraintManager.deleteConstraint = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var error, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .delete()
                                .eq('id', id)];
                    case 1:
                        error = (_a.sent()).error;
                        if (error) {
                            throw new Error("\u5236\u7D04\u6761\u4EF6\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        return [2 /*return*/, true];
                    case 2:
                        error_5 = _a.sent();
                        console.error('制約条件削除エラー:', error_5);
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 制約条件の有効/無効を切り替え
     */
    ConstraintManager.toggleConstraintStatus = function (id, isActive) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .update({
                                is_active: isActive,
                                updated_at: new Date().toISOString()
                            })
                                .eq('id', id)
                                .select()
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new Error("\u5236\u7D04\u6761\u4EF6\u306E\u72B6\u614B\u5909\u66F4\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        return [2 /*return*/, data];
                    case 2:
                        error_6 = _b.sent();
                        console.error('制約条件状態変更エラー:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 制約違反をログに記録
     */
    ConstraintManager.logViolations = function (violations, batchId) {
        return __awaiter(this, void 0, void 0, function () {
            var violationRecords, error, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (violations.length === 0)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        violationRecords = violations.map(function (violation) { return ({
                            constraint_id: violation.constraint.id,
                            shift_generation_batch_id: batchId,
                            employee_id: violation.employee_id,
                            violation_date: violation.violation_date,
                            violation_type: violation.violation_type,
                            violation_description: violation.violation_description,
                            severity_level: violation.severity_level,
                            resolved: false
                        }); });
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.VIOLATIONS_TABLE)
                                .insert(violationRecords)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            throw new Error("\u5236\u7D04\u9055\u53CD\u30ED\u30B0\u306E\u8A18\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        console.log("\u2705 ".concat(violations.length, "\u4EF6\u306E\u5236\u7D04\u9055\u53CD\u3092\u30ED\u30B0\u306B\u8A18\u9332\u3057\u307E\u3057\u305F"));
                        return [3 /*break*/, 4];
                    case 3:
                        error_7 = _a.sent();
                        console.error('制約違反ログ記録エラー:', error_7);
                        throw error_7;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 制約条件の統計情報を取得
     */
    ConstraintManager.getConstraintStatistics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, stats_1, error_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .select('constraint_category, enforcement_level, is_active, priority_level')];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new Error("\u7D71\u8A08\u60C5\u5831\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message));
                        }
                        stats_1 = {
                            total: (data === null || data === void 0 ? void 0 : data.length) || 0,
                            byCategory: {},
                            byEnforcement: {},
                            byStatus: { active: 0, inactive: 0 },
                            byPriority: { mandatory: 0, high: 0, medium: 0, low: 0 }
                        };
                        data === null || data === void 0 ? void 0 : data.forEach(function (constraint) {
                            // カテゴリ別
                            stats_1.byCategory[constraint.constraint_category] =
                                (stats_1.byCategory[constraint.constraint_category] || 0) + 1;
                            // 強制レベル別
                            stats_1.byEnforcement[constraint.enforcement_level] =
                                (stats_1.byEnforcement[constraint.enforcement_level] || 0) + 1;
                            // 状態別
                            if (constraint.is_active) {
                                stats_1.byStatus.active++;
                            }
                            else {
                                stats_1.byStatus.inactive++;
                            }
                            // 優先度別
                            if (constraint.priority_level === 0) {
                                stats_1.byPriority.mandatory++;
                            }
                            else if (constraint.priority_level <= 20) {
                                stats_1.byPriority.high++;
                            }
                            else if (constraint.priority_level <= 50) {
                                stats_1.byPriority.medium++;
                            }
                            else {
                                stats_1.byPriority.low++;
                            }
                        });
                        return [2 /*return*/, stats_1];
                    case 2:
                        error_8 = _b.sent();
                        console.error('統計情報取得エラー:', error_8);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * データベーステーブルの存在確認
     */
    ConstraintManager.checkTableExists = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabaseClient_1.supabase
                                .from(this.TABLE_NAME)
                                .select('id')
                                .limit(1)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                                console.log('⚠️ 制約条件テーブルが存在しません');
                                return [2 /*return*/, false];
                            }
                            throw error;
                        }
                        console.log('✅ 制約条件テーブルが存在します');
                        return [2 /*return*/, true];
                    case 2:
                        error_9 = _b.sent();
                        console.error('テーブル存在確認エラー:', error_9);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * サンプルデータの作成
     */
    ConstraintManager.createSampleConstraints = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sampleConstraints, _i, sampleConstraints_1, constraint, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sampleConstraints = [
                            {
                                constraint_name: '労働基準法 - 最大連続出勤日数',
                                constraint_category: '法令遵守',
                                constraint_type: 'max_consecutive_days',
                                constraint_value: 6,
                                constraint_description: '労働基準法に基づく最大連続出勤日数制限',
                                applicable_locations: ['全拠点'],
                                priority_level: 0,
                                enforcement_level: 'mandatory',
                                is_active: true
                            },
                            {
                                constraint_name: '勤務間インターバル規制',
                                constraint_category: '法令遵守',
                                constraint_type: 'min_rest_hours',
                                constraint_value: 11,
                                constraint_description: '勤務間インターバル規制（11時間以上の休息）',
                                applicable_locations: ['全拠点'],
                                priority_level: 0,
                                enforcement_level: 'mandatory',
                                is_active: true
                            },
                            {
                                constraint_name: '週40時間労働制限',
                                constraint_category: '法令遵守',
                                constraint_type: 'max_weekly_hours',
                                constraint_value: 40,
                                constraint_description: '労働基準法に基づく週40時間労働制限',
                                applicable_locations: ['全拠点'],
                                priority_level: 5,
                                enforcement_level: 'mandatory',
                                is_active: true
                            },
                            {
                                constraint_name: '川越拠点 - 業務カバレッジ',
                                constraint_category: 'その他',
                                constraint_type: 'daily_coverage',
                                constraint_value: 2,
                                constraint_description: '川越拠点では各業務に最低2名配置',
                                applicable_locations: ['川越'],
                                priority_level: 20,
                                enforcement_level: 'strict',
                                is_active: true
                            }
                        ];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        _i = 0, sampleConstraints_1 = sampleConstraints;
                        _a.label = 2;
                    case 2:
                        if (!(_i < sampleConstraints_1.length)) return [3 /*break*/, 5];
                        constraint = sampleConstraints_1[_i];
                        return [4 /*yield*/, this.createConstraint(constraint)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        console.log('✅ サンプル制約条件を作成しました');
                        return [3 /*break*/, 7];
                    case 6:
                        error_10 = _a.sent();
                        console.error('サンプルデータ作成エラー:', error_10);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ConstraintManager.TABLE_NAME = 'enhanced_constraints';
    ConstraintManager.VIOLATIONS_TABLE = 'constraint_violations';
    return ConstraintManager;
}());
exports.ConstraintManager = ConstraintManager;
