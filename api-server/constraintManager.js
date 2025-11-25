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
exports.ConstraintManager = void 0;
const supabaseClient_1 = require("./supabaseClient");
class ConstraintManager {
    /**
     * 全ての制約条件を取得
     */
    static getAllConstraints() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabaseClient_1.supabase
                    .from(this.TABLE_NAME)
                    .select('*')
                    .order('priority_level', { ascending: true })
                    .order('constraint_category', { ascending: true })
                    .order('constraint_name', { ascending: true });
                if (error) {
                    throw new Error(`制約条件の取得に失敗しました: ${error.message}`);
                }
                return data || [];
            }
            catch (error) {
                console.error('制約条件取得エラー:', error);
                throw error;
            }
        });
    }
    /**
     * 指定拠点の有効な制約条件を取得
     */
    static getActiveConstraintsByLocation(location) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabaseClient_1.supabase
                    .from(this.TABLE_NAME)
                    .select('*')
                    .eq('is_active', true)
                    .order('priority_level', { ascending: true });
                if (error) {
                    throw new Error(`制約条件の取得に失敗しました: ${error.message}`);
                }
                // 指定拠点に適用される制約のみフィルタリング
                const filteredConstraints = (data || []).filter(constraint => constraint.applicable_locations.includes(location) ||
                    constraint.applicable_locations.includes('全拠点'));
                return filteredConstraints;
            }
            catch (error) {
                console.error('制約条件取得エラー:', error);
                throw error;
            }
        });
    }
    /**
     * 制約条件を作成
     */
    static createConstraint(constraintData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabaseClient_1.supabase
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
                    .single();
                if (error) {
                    throw new Error(`制約条件の作成に失敗しました: ${error.message}`);
                }
                return data;
            }
            catch (error) {
                console.error('制約条件作成エラー:', error);
                throw error;
            }
        });
    }
    /**
     * 制約条件を更新
     */
    static updateConstraint(id, constraintData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabaseClient_1.supabase
                    .from(this.TABLE_NAME)
                    .update(Object.assign(Object.assign({}, constraintData), { updated_at: new Date().toISOString() }))
                    .eq('id', id)
                    .select()
                    .single();
                if (error) {
                    throw new Error(`制約条件の更新に失敗しました: ${error.message}`);
                }
                return data;
            }
            catch (error) {
                console.error('制約条件更新エラー:', error);
                throw error;
            }
        });
    }
    /**
     * 制約条件を削除
     */
    static deleteConstraint(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = yield supabaseClient_1.supabase
                    .from(this.TABLE_NAME)
                    .delete()
                    .eq('id', id);
                if (error) {
                    throw new Error(`制約条件の削除に失敗しました: ${error.message}`);
                }
                return true;
            }
            catch (error) {
                console.error('制約条件削除エラー:', error);
                throw error;
            }
        });
    }
    /**
     * 制約条件の有効/無効を切り替え
     */
    static toggleConstraintStatus(id, isActive) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabaseClient_1.supabase
                    .from(this.TABLE_NAME)
                    .update({
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', id)
                    .select()
                    .single();
                if (error) {
                    throw new Error(`制約条件の状態変更に失敗しました: ${error.message}`);
                }
                return data;
            }
            catch (error) {
                console.error('制約条件状態変更エラー:', error);
                throw error;
            }
        });
    }
    /**
     * 制約違反をログに記録
     */
    static logViolations(violations, batchId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (violations.length === 0)
                return;
            try {
                const violationRecords = violations.map(violation => ({
                    constraint_id: violation.constraint.id,
                    shift_generation_batch_id: batchId,
                    employee_id: violation.employee_id,
                    violation_date: violation.violation_date,
                    violation_type: violation.violation_type,
                    violation_description: violation.violation_description,
                    severity_level: violation.severity_level,
                    resolved: false
                }));
                const { error } = yield supabaseClient_1.supabase
                    .from(this.VIOLATIONS_TABLE)
                    .insert(violationRecords);
                if (error) {
                    throw new Error(`制約違反ログの記録に失敗しました: ${error.message}`);
                }
                console.log(`✅ ${violations.length}件の制約違反をログに記録しました`);
            }
            catch (error) {
                console.error('制約違反ログ記録エラー:', error);
                throw error;
            }
        });
    }
    /**
     * 制約条件の統計情報を取得
     */
    static getConstraintStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabaseClient_1.supabase
                    .from(this.TABLE_NAME)
                    .select('constraint_category, enforcement_level, is_active, priority_level');
                if (error) {
                    throw new Error(`統計情報の取得に失敗しました: ${error.message}`);
                }
                const stats = {
                    total: (data === null || data === void 0 ? void 0 : data.length) || 0,
                    byCategory: {},
                    byEnforcement: {},
                    byStatus: { active: 0, inactive: 0 },
                    byPriority: { mandatory: 0, high: 0, medium: 0, low: 0 }
                };
                data === null || data === void 0 ? void 0 : data.forEach(constraint => {
                    // カテゴリ別
                    stats.byCategory[constraint.constraint_category] =
                        (stats.byCategory[constraint.constraint_category] || 0) + 1;
                    // 強制レベル別
                    stats.byEnforcement[constraint.enforcement_level] =
                        (stats.byEnforcement[constraint.enforcement_level] || 0) + 1;
                    // 状態別
                    if (constraint.is_active) {
                        stats.byStatus.active++;
                    }
                    else {
                        stats.byStatus.inactive++;
                    }
                    // 優先度別
                    if (constraint.priority_level === 0) {
                        stats.byPriority.mandatory++;
                    }
                    else if (constraint.priority_level <= 20) {
                        stats.byPriority.high++;
                    }
                    else if (constraint.priority_level <= 50) {
                        stats.byPriority.medium++;
                    }
                    else {
                        stats.byPriority.low++;
                    }
                });
                return stats;
            }
            catch (error) {
                console.error('統計情報取得エラー:', error);
                return null;
            }
        });
    }
    /**
     * データベーステーブルの存在確認
     */
    static checkTableExists() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield supabaseClient_1.supabase
                    .from(this.TABLE_NAME)
                    .select('id')
                    .limit(1);
                if (error) {
                    if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                        console.log('⚠️ 制約条件テーブルが存在しません');
                        return false;
                    }
                    throw error;
                }
                console.log('✅ 制約条件テーブルが存在します');
                return true;
            }
            catch (error) {
                console.error('テーブル存在確認エラー:', error);
                return false;
            }
        });
    }
    /**
     * サンプルデータの作成
     */
    static createSampleConstraints() {
        return __awaiter(this, void 0, void 0, function* () {
            const sampleConstraints = [
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
            try {
                for (const constraint of sampleConstraints) {
                    yield this.createConstraint(constraint);
                }
                console.log('✅ サンプル制約条件を作成しました');
            }
            catch (error) {
                console.error('サンプルデータ作成エラー:', error);
            }
        });
    }
}
exports.ConstraintManager = ConstraintManager;
ConstraintManager.TABLE_NAME = 'enhanced_constraints';
ConstraintManager.VIOLATIONS_TABLE = 'constraint_violations';
