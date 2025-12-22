/**
 * 統合シフトルールのテンプレート集
 */

import type { RuleTemplate } from '../types/unifiedRule';

/**
 * 制約条件のテンプレート
 */
export const CONSTRAINT_TEMPLATES: RuleTemplate[] = [
  {
    name: '最大連続勤務日数',
    category: '労働時間制約',
    type: 'constraint',
    description: '従業員の連続勤務日数を制限します',
    config: {
      constraint_type: 'max_consecutive_days',
      value: 5,
      unit: 'days',
      scope: 'employee'
    },
    default_priority: 0,
    default_enforcement: 'mandatory'
  },
  {
    name: '最小休憩時間',
    category: '労働時間制約',
    type: 'constraint',
    description: 'シフト間の最小休憩時間を設定します',
    config: {
      constraint_type: 'min_rest_hours',
      value: 11,
      unit: 'hours',
      scope: 'employee'
    },
    default_priority: 0,
    default_enforcement: 'mandatory'
  },
  {
    name: '月間最大勤務日数',
    category: '労働時間制約',
    type: 'constraint',
    description: '月間の最大勤務日数を制限します',
    config: {
      constraint_type: 'max_monthly_days',
      value: 20,
      unit: 'days',
      scope: 'employee'
    },
    default_priority: 1,
    default_enforcement: 'mandatory'
  },
  {
    name: '週間最大勤務時間',
    category: '労働時間制約',
    type: 'constraint',
    description: '週間の最大勤務時間を制限します',
    config: {
      constraint_type: 'max_weekly_hours',
      value: 40,
      unit: 'hours',
      scope: 'employee'
    },
    default_priority: 1,
    default_enforcement: 'recommended'
  }
];

/**
 * フィルターのテンプレート
 */
export const FILTER_TEMPLATES: RuleTemplate[] = [
  {
    name: 'スキルレベルフィルター',
    category: '従業員フィルター',
    type: 'filter',
    description: '指定したスキルレベル以上の従業員のみを対象にします',
    config: {
      filter_type: 'skill_level',
      conditions: [
        {
          field: 'skill_level',
          operator: '>=',
          value: 3
        }
      ]
    },
    default_priority: 5,
    default_enforcement: 'recommended'
  },
  {
    name: '経験年数フィルター',
    category: '従業員フィルター',
    type: 'filter',
    description: '指定した経験年数以上の従業員のみを対象にします',
    config: {
      filter_type: 'experience_years',
      conditions: [
        {
          field: 'experience_years',
          operator: '>',
          value: 1
        }
      ]
    },
    default_priority: 5,
    default_enforcement: 'recommended'
  },
  {
    name: '資格保有者フィルター',
    category: '従業員フィルター',
    type: 'filter',
    description: '特定の資格を保有する従業員のみを対象にします',
    config: {
      filter_type: 'qualification',
      conditions: [
        {
          field: 'qualifications',
          operator: 'contains',
          value: '運行管理者'
        }
      ]
    },
    default_priority: 3,
    default_enforcement: 'mandatory'
  }
];

/**
 * 割り当てロジックのテンプレート
 */
export const ASSIGNMENT_TEMPLATES: RuleTemplate[] = [
  {
    name: '経験者優先割り当て',
    category: '優先割り当て',
    type: 'assignment',
    description: '経験豊富な従業員を優先的に割り当てます',
    config: {
      assignment_strategy: 'experience_based',
      priority_factors: [
        {
          factor: 'experience_score',
          weight: 0.6
        },
        {
          factor: 'skill_match',
          weight: 0.4
        }
      ]
    },
    default_priority: 5,
    default_enforcement: 'recommended'
  },
  {
    name: 'ローテーション方式',
    category: '公平性',
    type: 'assignment',
    description: '従業員間で公平にシフトを割り当てます',
    config: {
      assignment_strategy: 'rotation',
      priority_factors: [
        {
          factor: 'recent_assignment_count',
          weight: 0.7,
          inverse: true
        },
        {
          factor: 'total_hours',
          weight: 0.3,
          inverse: true
        }
      ]
    },
    default_priority: 5,
    default_enforcement: 'recommended'
  },
  {
    name: 'スキルマッチ優先',
    category: '最適配置',
    type: 'assignment',
    description: '業務に最も適したスキルを持つ従業員を割り当てます',
    config: {
      assignment_strategy: 'skill_match',
      priority_factors: [
        {
          factor: 'skill_match',
          weight: 0.8
        },
        {
          factor: 'availability',
          weight: 0.2
        }
      ]
    },
    default_priority: 4,
    default_enforcement: 'recommended'
  }
];

/**
 * 検証のテンプレート
 */
export const VALIDATION_TEMPLATES: RuleTemplate[] = [
  {
    name: '業務カバレッジチェック',
    category: 'シフト検証',
    type: 'validation',
    description: 'すべての業務が適切にカバーされているか検証します',
    config: {
      validation_type: 'coverage_check',
      min_coverage: 1.0,
      check_all_business_groups: true
    },
    default_priority: 1,
    default_enforcement: 'mandatory'
  },
  {
    name: 'ペア業務組み合わせチェック',
    category: 'シフト検証',
    type: 'validation',
    description: 'ペア業務の組み合わせが適切か検証します',
    config: {
      validation_type: 'pair_business_check',
      required_pairs: []
    },
    default_priority: 2,
    default_enforcement: 'mandatory'
  },
  {
    name: '人員配置バランスチェック',
    category: 'シフト検証',
    type: 'validation',
    description: '人員配置のバランスが適切か検証します',
    config: {
      validation_type: 'balance_check',
      max_deviation: 0.2
    },
    default_priority: 3,
    default_enforcement: 'recommended'
  }
];

/**
 * 最適化のテンプレート
 */
export const OPTIMIZATION_TEMPLATES: RuleTemplate[] = [
  {
    name: '残業時間最小化',
    category: 'コスト最適化',
    type: 'optimization',
    description: '残業時間を最小化するようシフトを最適化します',
    config: {
      optimization_goal: 'minimize_overtime',
      constraints: [
        {
          type: 'max_daily_hours',
          value: 8
        }
      ]
    },
    default_priority: 7,
    default_enforcement: 'optional'
  },
  {
    name: '負荷均等化',
    category: '公平性',
    type: 'optimization',
    description: '従業員間の負荷を均等化します',
    config: {
      optimization_goal: 'balance_workload',
      target_variance: 0.1
    },
    default_priority: 6,
    default_enforcement: 'optional'
  },
  {
    name: '移動距離最小化',
    category: 'コスト最適化',
    type: 'optimization',
    description: '従業員の移動距離を最小化します',
    config: {
      optimization_goal: 'minimize_travel',
      consider_location: true
    },
    default_priority: 8,
    default_enforcement: 'optional'
  }
];

/**
 * 全テンプレート
 */
export const ALL_TEMPLATES: RuleTemplate[] = [
  ...CONSTRAINT_TEMPLATES,
  ...FILTER_TEMPLATES,
  ...ASSIGNMENT_TEMPLATES,
  ...VALIDATION_TEMPLATES,
  ...OPTIMIZATION_TEMPLATES
];

/**
 * カテゴリ別テンプレート
 */
export const TEMPLATES_BY_CATEGORY = {
  constraint: CONSTRAINT_TEMPLATES,
  filter: FILTER_TEMPLATES,
  assignment: ASSIGNMENT_TEMPLATES,
  validation: VALIDATION_TEMPLATES,
  optimization: OPTIMIZATION_TEMPLATES
};

/**
 * テンプレートから新しいルールを作成
 */
export function createRuleFromTemplate(
  template: RuleTemplate,
  overrides?: Partial<{
    rule_name: string;
    description: string;
    applicable_locations: string[];
    priority_level: number;
    enforcement_level: string;
  }>
) {
  return {
    rule_name: overrides?.rule_name || template.name,
    rule_category: template.category,
    description: overrides?.description || template.description,
    applicable_locations: overrides?.applicable_locations || ['全拠点'],
    rule_type: template.type,
    rule_config: template.config,
    priority_level: overrides?.priority_level ?? template.default_priority ?? 5,
    enforcement_level: overrides?.enforcement_level || template.default_enforcement || 'recommended',
    is_active: true
  };
}
