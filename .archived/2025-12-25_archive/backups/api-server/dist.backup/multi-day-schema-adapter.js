"use strict";
/**
 * 複数日業務のデータベーススキーマアダプター
 * 既存のbusiness_masterテーブルのフィールドを使用して、
 * multi_day_configを動的に生成する
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptBusinessMasterForMultiDay = adaptBusinessMasterForMultiDay;
exports.adaptBusinessMastersForMultiDay = adaptBusinessMastersForMultiDay;
/**
 * データベースから取得した業務マスタに、multi_day_configを追加
 * @param dbBusiness データベースから取得した業務マスタ
 * @returns multi_day_configが追加された業務マスタ
 */
function adaptBusinessMasterForMultiDay(dbBusiness) {
    const business = { ...dbBusiness };
    // 業務タイプが'multi_day'の場合のみ処理
    if (business.業務タイプ !== 'multi_day') {
        return business;
    }
    console.log(`🔧 [ADAPTER] Adapting multi-day business: ${business.業務id}`);
    // 運行日数（デフォルト: 2日）
    const durationDays = business.運行日数 || 2;
    // 班指定から team_filter を決定
    const teamFilter = business.班指定 || undefined;
    // 方向（even/odd）から applicable_dates を決定
    let applicableDates = 'all';
    if (business.方向 === 'even') {
        applicableDates = 'even_days';
    }
    else if (business.方向 === 'odd') {
        applicableDates = 'odd_days';
    }
    // ローテーションルールを構築
    const rotationRule = (applicableDates !== 'all' || teamFilter) ? {
        applicable_dates: applicableDates,
        team_filter: teamFilter
    } : undefined;
    // 日次スケジュールを構築（夜行バスの場合: 往路・復路）
    const daySchedules = [];
    // 2日間の夜行バス業務か、それ以外のN日業務（研修など）かを判定
    const isOvernightBus = durationDays === 2 && (business.業務id.includes('GALAXY') || business.業務id.includes('AUBE'));
    if (isOvernightBus) {
        // 2日間夜行バスのスケジュールを生成
        daySchedules.push({
            day: 1,
            direction: 'outbound',
            start_time: business.開始時間 || '19:00',
            end_time: '23:59',
            date_offset: 0,
            business_name_suffix: '（往路）'
        });
        daySchedules.push({
            day: 2,
            direction: 'return',
            start_time: '00:00',
            end_time: business.終了時間 || '09:00',
            date_offset: 1,
            business_name_suffix: '（復路）'
        });
        console.log(`  [ADAPTER] Generated 2-day overnight bus schedule`);
    }
    else {
        // 一般的なN日業務（研修、出張など）のスケジュールを生成
        for (let day = 1; day <= durationDays; day++) {
            daySchedules.push({
                day,
                start_time: business.開始時間 || '09:00',
                end_time: business.終了時間 || '18:00',
                date_offset: day - 1,
                business_name_suffix: ` (${day}/${durationDays})`
            });
        }
        console.log(`  [ADAPTER] Generated generic ${durationDays}-day schedule`);
    }
    // multi_day_config を構築
    const multiDayConfig = {
        duration_days: durationDays,
        day_schedules: daySchedules,
        rotation_rule: rotationRule,
        is_multi_day: true
    };
    business.multi_day_config = multiDayConfig;
    console.log(`  ✅ Config created: ${durationDays} days, ${applicableDates}, team=${teamFilter || 'any'}`);
    return business;
}
/**
 * 業務マスタリストを一括でアダプト
 * @param dbBusinesses データベースから取得した業務マスタリスト
 * @returns multi_day_configが追加された業務マスタリスト
 */
function adaptBusinessMastersForMultiDay(dbBusinesses) {
    return dbBusinesses.map(adaptBusinessMasterForMultiDay);
}
