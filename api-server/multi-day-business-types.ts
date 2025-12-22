/**
 * 複数日業務の型定義
 * 夜行バスなど、複数日にまたがる業務をサポート
 */

export interface DaySchedule {
  day: number;                    // 1, 2, 3... (業務セット内の日数)
  direction?: 'outbound' | 'return';  // 往路/復路（夜行バス用）
  start_time: string;             // HH:MM:SS
  end_time: string;               // HH:MM:SS
  date_offset: number;            // 開始日からの日数オフセット (0, 1, 2...)
  business_name_suffix?: string;  // 業務名のサフィックス（例: "（往路）", "（復路）"）
}

export interface RotationRule {
  applicable_dates: 'even_days' | 'odd_days' | 'all';  // 適用される日付パターン
  team_filter?: string;           // 班指定（Galaxy, Aube など）
}

export interface MultiDayBusinessConfig {
  duration_days: number;          // 業務の日数（2日セットなら2）
  day_schedules: DaySchedule[];   // 各日のスケジュール
  rotation_rule?: RotationRule;   // ローテーションルール
  is_multi_day: true;             // 複数日業務フラグ
}

export interface BusinessMaster {
  // 基本情報
  業務id: string;
  業務名: string;
  業務グループ: string;
  業務タイプ: string;
  営業所: string;
  
  // 時間情報（単日業務の場合）
  開始時間?: string;
  終了時間?: string;
  
  // ペア業務（従来の同日ペア）
  ペア業務id?: string | null;
  
  // 複数日業務（新機能）
  multi_day_config?: MultiDayBusinessConfig;
  
  // その他
  方向?: string;
  班指定?: string;
  運行日数?: number;
  
  // データベースの互換性のため
  id?: string;
  name?: string;
  business_group?: string;
  location?: string;
}

/**
 * 複数日業務かどうかを判定
 */
export function isMultiDayBusiness(business: BusinessMaster): boolean {
  return business.multi_day_config?.is_multi_day === true;
}

/**
 * 業務が指定された日付に適用されるかチェック
 */
export function isApplicableDate(business: BusinessMaster, date: string): boolean {
  const config = business.multi_day_config;
  if (!config || !config.rotation_rule) {
    return true;  // ルールがない場合は常に適用
  }
  
  const dateObj = new Date(date);
  const dayOfMonth = dateObj.getDate();
  
  switch (config.rotation_rule.applicable_dates) {
    case 'even_days':
      return dayOfMonth % 2 === 0;
    case 'odd_days':
      return dayOfMonth % 2 === 1;
    case 'all':
    default:
      return true;
  }
}

/**
 * 日付に日数を加算
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * 複数日業務セットのIDを生成
 */
export function generateMultiDaySetId(businessId: string, startDate: string): string {
  return `${businessId}_${startDate}`;
}
