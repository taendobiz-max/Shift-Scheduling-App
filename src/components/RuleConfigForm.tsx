/**
 * ルール設定フォーム
 * rule_type に応じて適切な入力フォームを表示する
 */
import React from 'react';
import type { RuleType, RuleConfig } from '../types/unifiedRule';

interface RuleConfigFormProps {
  ruleType: RuleType;
  config: RuleConfig;
  onChange: (config: RuleConfig) => void;
}

// ===== constraint フォーム =====
const CONSTRAINT_TYPES = [
  { value: 'max_consecutive_days', label: '最大連続出勤日数' },
  { value: 'max_daily_work_hours', label: '1日の最大労働時間' },
  { value: 'max_daily_shifts', label: '1日の最大シフト数' },
  { value: 'monthly_days_off', label: '月間休暇日数' },
  { value: 'daily_extra_staff', label: '追加出勤人数' },
  { value: 'business_required_staff', label: '業務必要人数' },
  { value: 'vacation_exclusion', label: '休暇申請者の除外' },
  { value: 'exclusive_assignment', label: '排他制約（同日に複数業務不可）' },
  { value: 'overnight_bus_exclusion', label: '夜行バス排他制御' },
  { value: 'allowance_balance', label: '手当付き業務の均等配分' },
] as const;

const SCOPE_OPTIONS = [
  { value: 'day', label: '1日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
  { value: 'employee', label: '従業員' },
];

const ConstraintForm: React.FC<{ config: RuleConfig; onChange: (c: RuleConfig) => void }> = ({ config, onChange }) => {
  const constraintType = config.constraint_type || '';
  const needsValue = !['vacation_exclusion', 'exclusive_assignment', 'overnight_bus_exclusion'].includes(constraintType);
  const needsExclusiveGroups = constraintType === 'exclusive_assignment';
  const needsBusinessTypes = constraintType === 'overnight_bus_exclusion';

  const handleExclusiveGroupsChange = (text: string) => {
    try {
      // 改行区切りでグループを入力（各行がカンマ区切りの業務名）
      const groups = text.split('\n').filter(line => line.trim()).map(line =>
        line.split(',').map(s => s.trim()).filter(s => s)
      );
      onChange({ ...config, exclusive_groups: groups });
    } catch {
      // 入力中は無視
    }
  };

  const handleBusinessTypesChange = (text: string) => {
    const types = text.split('\n').filter(line => line.trim());
    onChange({ ...config, business_types: types });
  };

  return (
    <div className="space-y-4">
      {/* constraint_type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          制約タイプ <span className="text-red-500">*</span>
        </label>
        <select
          value={constraintType}
          onChange={(e) => onChange({ ...config, constraint_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">-- 選択してください --</option>
          {CONSTRAINT_TYPES.map(ct => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
      </div>

      {/* value（数値） */}
      {needsValue && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            値 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={config.value ?? ''}
            onChange={(e) => onChange({ ...config, value: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="例: 6"
            min={0}
          />
        </div>
      )}

      {/* unit */}
      {needsValue && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
          <input
            type="text"
            value={config.unit || ''}
            onChange={(e) => onChange({ ...config, unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="例: hours / days / shifts"
          />
        </div>
      )}

      {/* scope */}
      {needsValue && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">スコープ</label>
          <select
            value={config.scope || ''}
            onChange={(e) => onChange({ ...config, scope: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">-- 選択してください --</option>
            {SCOPE_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* exclusive_groups（排他制約用） */}
      {needsExclusiveGroups && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            排他グループ（1行に1グループ、業務名をカンマ区切り）
          </label>
          <textarea
            value={(config.exclusive_groups as string[][] || []).map(g => g.join(', ')).join('\n')}
            onChange={(e) => handleExclusiveGroupsChange(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            placeholder={'例:\n点呼①早番, 点呼②遅番\n夜行バス（往路）, 夜行バス（復路）'}
          />
          <p className="text-xs text-gray-500 mt-1">同一グループ内の業務は同じ従業員に同日アサインできません</p>
        </div>
      )}

      {/* business_types（夜行バス排他用） */}
      {needsBusinessTypes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            対象業務タイプ（1行に1業務名）
          </label>
          <textarea
            value={(config.business_types as string[] || []).join('\n')}
            onChange={(e) => handleBusinessTypesChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            placeholder={'例:\n夜行バス（往路）\n夜行バス（復路）'}
          />
        </div>
      )}

      {/* enforcement（夜行バス排他用） */}
      {needsBusinessTypes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">強制度</label>
          <select
            value={config.enforcement || 'strict'}
            onChange={(e) => onChange({ ...config, enforcement: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="strict">strict（厳格）</option>
            <option value="soft">soft（推奨）</option>
          </select>
        </div>
      )}
    </div>
  );
};

// ===== filter フォーム =====
const FILTER_TYPES = [
  { value: 'team_rotation_filter', label: '班ローテーションフィルタ（夜行バス等）' },
  { value: 'team_filter', label: '班指定フィルタ' },
  { value: 'skill_filter', label: 'スキルマトリックスフィルタ' },
  { value: 'roll_call_filter', label: '点呼対応可能フィルタ' },
] as const;

const FilterForm: React.FC<{ config: RuleConfig; onChange: (c: RuleConfig) => void }> = ({ config, onChange }) => {
  const filterType = config.actions?.filter_employees?.handler || '';

  const handleFilterTypeChange = (newType: string) => {
    const baseConfig: RuleConfig = {
      ...config,
      actions: {
        filter_employees: {
          handler: newType,
          params: getDefaultParams(newType),
        },
      },
    };
    onChange(baseConfig);
  };

  const getDefaultParams = (type: string): Record<string, unknown> => {
    switch (type) {
      case 'team_rotation_filter':
        return {
          teams: ['Galaxy', 'Aube'],
          base_date: new Date().toISOString().split('T')[0],
          rotation_logic: {
            even_day: { outbound: 'Galaxy', return: 'Aube' },
            odd_day: { outbound: 'Aube', return: 'Galaxy' },
          },
        };
      default:
        return {};
    }
  };

  const params = config.actions?.filter_employees?.params || {};

  const handleParamChange = (key: string, value: unknown) => {
    onChange({
      ...config,
      actions: {
        filter_employees: {
          handler: filterType,
          params: { ...params, [key]: value },
        },
      },
    });
  };

  const handleRotationLogicChange = (
    dayType: 'even_day' | 'odd_day',
    direction: 'outbound' | 'return',
    value: string
  ) => {
    const currentLogic = (params.rotation_logic as Record<string, Record<string, string>>) || {};
    const newLogic = {
      ...currentLogic,
      [dayType]: {
        ...(currentLogic[dayType] || {}),
        [direction]: value,
      },
    };
    handleParamChange('rotation_logic', newLogic);
  };

  return (
    <div className="space-y-4">
      {/* filter_type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          フィルタータイプ <span className="text-red-500">*</span>
        </label>
        <select
          value={filterType}
          onChange={(e) => handleFilterTypeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">-- 選択してください --</option>
          {FILTER_TYPES.map(ft => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
      </div>

      {/* team_rotation_filter 用パラメータ */}
      {filterType === 'team_rotation_filter' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              基準日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={(params.base_date as string) || ''}
              onChange={(e) => handleParamChange('base_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">この日を基準に偶数日・奇数日を判定します</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              班リスト（カンマ区切り）
            </label>
            <input
              type="text"
              value={((params.teams as string[]) || []).join(', ')}
              onChange={(e) => handleParamChange('teams', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="例: Galaxy, Aube"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ローテーションロジック</label>
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              {(['even_day', 'odd_day'] as const).map(dayType => (
                <div key={dayType}>
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    {dayType === 'even_day' ? '偶数日（基準日から0, 2, 4...日後）' : '奇数日（基準日から1, 3, 5...日後）'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['outbound', 'return'] as const).map(direction => {
                      const rotationLogic = (params.rotation_logic as Record<string, Record<string, string>>) || {};
                      return (
                        <div key={direction}>
                          <label className="block text-xs text-gray-500 mb-1">
                            {direction === 'outbound' ? '往路' : '復路'}
                          </label>
                          <input
                            type="text"
                            value={rotationLogic[dayType]?.[direction] || ''}
                            onChange={(e) => handleRotationLogicChange(dayType, direction, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="班名"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* team_filter / skill_filter / roll_call_filter は追加パラメータなし */}
      {(filterType === 'team_filter' || filterType === 'skill_filter' || filterType === 'roll_call_filter') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            {filterType === 'team_filter' && '業務マスタの「班指定」フィールドを参照して自動的に班フィルタを適用します。追加パラメータは不要です。'}
            {filterType === 'skill_filter' && 'スキルマトリックスに基づいて自動的に適性フィルタを適用します。追加パラメータは不要です。'}
            {filterType === 'roll_call_filter' && '点呼対応可能な従業員（roll_call_capable=true または roll_call_duty=1）のみを抽出します。追加パラメータは不要です。'}
          </p>
        </div>
      )}
    </div>
  );
};

// ===== assignment フォーム =====
const ASSIGNMENT_TYPES = [
  { value: 'consecutive_pair', label: '連続ペア割り当て（夜行バス往復等）' },
  { value: 'round_robin', label: 'ラウンドロビン（均等配分）' },
  { value: 'priority_based', label: '優先度ベース割り当て' },
] as const;

const AssignmentForm: React.FC<{ config: RuleConfig; onChange: (c: RuleConfig) => void }> = ({ config, onChange }) => {
  const assignmentType = config.assignment_type || config.actions?.assign_pair?.handler || '';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          割り当てタイプ <span className="text-red-500">*</span>
        </label>
        <select
          value={assignmentType}
          onChange={(e) => onChange({ ...config, assignment_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">-- 選択してください --</option>
          {ASSIGNMENT_TYPES.map(at => (
            <option key={at.value} value={at.value}>{at.label}</option>
          ))}
        </select>
      </div>

      {assignmentType === 'consecutive_pair' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ペアフィールド名</label>
            <input
              type="text"
              value={(config.pair_field as string) || ''}
              onChange={(e) => onChange({ ...config, pair_field: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="例: ペア業務id"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日数スパン</label>
            <input
              type="number"
              value={(config.days_span as number) || 1}
              onChange={(e) => onChange({ ...config, days_span: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              min={1}
            />
          </div>
        </>
      )}
    </div>
  );
};

// ===== validation フォーム =====
const VALIDATION_TYPES = [
  { value: 'required_staff_check', label: '必要人数チェック' },
  { value: 'skill_requirement_check', label: 'スキル要件チェック' },
  { value: 'time_overlap_check', label: '時間重複チェック' },
  { value: 'rest_time_check', label: '休息時間チェック' },
] as const;

const ValidationForm: React.FC<{ config: RuleConfig; onChange: (c: RuleConfig) => void }> = ({ config, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          検証タイプ <span className="text-red-500">*</span>
        </label>
        <select
          value={(config.validation_type as string) || ''}
          onChange={(e) => onChange({ ...config, validation_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">-- 選択してください --</option>
          {VALIDATION_TYPES.map(vt => (
            <option key={vt.value} value={vt.value}>{vt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">チェック条件（任意）</label>
        <textarea
          value={(config.condition as string) || ''}
          onChange={(e) => onChange({ ...config, condition: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="チェック条件を記述してください"
        />
      </div>
    </div>
  );
};

// ===== optimization フォーム =====
const OPTIMIZATION_TYPES = [
  { value: 'workload_balance', label: '作業負荷の均等化' },
  { value: 'preference_match', label: '希望シフトとのマッチング' },
  { value: 'cost_minimization', label: 'コスト最小化' },
] as const;

const OptimizationForm: React.FC<{ config: RuleConfig; onChange: (c: RuleConfig) => void }> = ({ config, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          最適化タイプ <span className="text-red-500">*</span>
        </label>
        <select
          value={(config.optimization_type as string) || ''}
          onChange={(e) => onChange({ ...config, optimization_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">-- 選択してください --</option>
          {OPTIMIZATION_TYPES.map(ot => (
            <option key={ot.value} value={ot.value}>{ot.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">重み（0.0〜1.0）</label>
        <input
          type="number"
          value={(config.weight as number) ?? 1.0}
          onChange={(e) => onChange({ ...config, weight: parseFloat(e.target.value) || 1.0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          min={0}
          max={1}
          step={0.1}
        />
      </div>
    </div>
  );
};

// ===== メインコンポーネント =====
const RuleConfigForm: React.FC<RuleConfigFormProps> = ({ ruleType, config, onChange }) => {
  const renderForm = () => {
    switch (ruleType) {
      case 'constraint':
        return <ConstraintForm config={config} onChange={onChange} />;
      case 'filter':
        return <FilterForm config={config} onChange={onChange} />;
      case 'assignment':
        return <AssignmentForm config={config} onChange={onChange} />;
      case 'validation':
        return <ValidationForm config={config} onChange={onChange} />;
      case 'optimization':
        return <OptimizationForm config={config} onChange={onChange} />;
      default:
        return null;
    }
  };

  const ruleTypeDescriptions: Record<RuleType, string> = {
    constraint: '制約条件: シフト生成時に守るべきルール（最大連続日数、労働時間上限等）',
    filter: 'フィルター: 業務に割り当て可能な従業員を絞り込むルール',
    assignment: '割り当てロジック: 従業員の割り当て方法を指定するルール',
    validation: '検証: シフト生成後の整合性チェックルール',
    optimization: '最適化: シフトの質を向上させる最適化パラメータ',
  };

  return (
    <div>
      {/* rule_type の説明 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
        <p className="text-xs text-gray-600">{ruleTypeDescriptions[ruleType]}</p>
      </div>

      {/* 各 rule_type のフォーム */}
      {renderForm()}
    </div>
  );
};

export default RuleConfigForm;
