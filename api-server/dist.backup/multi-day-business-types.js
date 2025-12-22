"use strict";
/**
 * 複数日業務の型定義
 * 夜行バスなど、複数日にまたがる業務をサポート
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMultiDayBusiness = isMultiDayBusiness;
exports.isApplicableDate = isApplicableDate;
exports.addDays = addDays;
exports.generateMultiDaySetId = generateMultiDaySetId;
/**
 * 複数日業務かどうかを判定
 */
function isMultiDayBusiness(business) {
    return business.multi_day_config?.is_multi_day === true;
}
/**
 * 業務が指定された日付に適用されるかチェック
 */
function isApplicableDate(business, date) {
    const config = business.multi_day_config;
    if (!config || !config.rotation_rule) {
        return true; // ルールがない場合は常に適用
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
function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}
/**
 * 複数日業務セットのIDを生成
 */
function generateMultiDaySetId(businessId, startDate) {
    return `${businessId}_${startDate}`;
}
