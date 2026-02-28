/**
 * アプリケーション全体で使用する定数の一元管理
 * @file src/constants/index.ts
 */

// ============================================================
// 営業所（拠点）
// ============================================================

/** 全営業所リスト（本社を除く） */
export const OFFICES = ['川越', '東京', '川口'] as const;
export type Office = typeof OFFICES[number];

/** 全営業所リスト（本社を含む） */
export const OFFICES_WITH_HQ = ['川越', '東京', '川口', '本社'] as const;
export type OfficeWithHQ = typeof OFFICES_WITH_HQ[number];

/** フィルタ用リスト（「全拠点」を含む） */
export const OFFICES_WITH_ALL = ['全拠点', ...OFFICES] as const;

/** 東京営業所の班リスト */
export const TOKYO_TEAMS = ['Galaxy', 'Aube', '無し'] as const;
export type TokyoTeam = typeof TOKYO_TEAMS[number];

// ============================================================
// 休暇種別
// ============================================================

/** 休暇種別リスト */
export const VACATION_TYPES = ['公休', '私用', '病欠', '忌引', 'その他'] as const;
export type VacationType = typeof VACATION_TYPES[number];

/** 希望休の理由文字列 */
export const VACATION_REASON_REQUESTED = '希望休' as const;

// ============================================================
// 雇用形態
// ============================================================

/** 雇用形態リスト */
export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract'] as const;
export type EmploymentType = typeof EMPLOYMENT_TYPES[number];

/** 雇用形態の表示名マッピング */
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  'full-time': '正社員',
  'part-time': 'パート',
  'contract': '契約社員',
};

// ============================================================
// シフト関連
// ============================================================

/** シフト保存時のデフォルト値 */
export const SHIFT_DEFAULTS = {
  DISPLAY_ORDER_MAX: 9999,
} as const;
