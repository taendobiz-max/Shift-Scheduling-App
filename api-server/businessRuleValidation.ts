import { validateString } from './security';

export const BUSINESS_RULE_TYPES = new Set([
  'employee_filter',
  'pair_business',
  'constraint_check',
  'custom'
]);

export type BusinessRuleWritePayload = {
  rule_id?: string;
  rule_name: string;
  rule_type: 'employee_filter' | 'pair_business' | 'constraint_check' | 'custom';
  priority: number;
  enabled: boolean;
  営業所: string | null;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  description: string | null;
};

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * business_rulesの書込みに使うDTOを許可フィールドだけで構成する。
 * 読取り専用値と未知プロパティは戻り値に含めず、DBへ永続化しない。
 */
export function sanitizeBusinessRulePayload(payload: unknown, requireRuleId: boolean): BusinessRuleWritePayload | null {
  if (!isJsonRecord(payload)) return null;
  const ruleId = requireRuleId ? validateString(payload.rule_id, 'rule_id', 128) : undefined;
  const ruleName = validateString(payload.rule_name, 'rule_name', 200);
  const ruleType = validateString(payload.rule_type, 'rule_type', 64);
  const priority = Number(payload.priority);
  const enabled = payload.enabled;
  const officeValue = payload['営業所'];
  const office = officeValue === null || officeValue === undefined || officeValue === ''
    ? null
    : validateString(officeValue, '営業所', 64);
  const conditions = payload.conditions;
  const actions = payload.actions;
  const descriptionValue = payload.description;
  const description = descriptionValue === null || descriptionValue === undefined || descriptionValue === ''
    ? null
    : validateString(descriptionValue, 'description', 1000);

  if ((requireRuleId && !ruleId) || !ruleName || !ruleType || !BUSINESS_RULE_TYPES.has(ruleType)
    || !Number.isInteger(priority) || priority < 0 || priority > 100 || typeof enabled !== 'boolean'
    || (officeValue !== null && officeValue !== undefined && officeValue !== '' && !office)
    || !isJsonRecord(conditions) || !isJsonRecord(actions)
    || (descriptionValue !== null && descriptionValue !== undefined && descriptionValue !== '' && !description)) {
    return null;
  }

  try {
    if (JSON.stringify(conditions).length > 20000 || JSON.stringify(actions).length > 20000) return null;
  } catch {
    return null;
  }

  return {
    ...(requireRuleId ? { rule_id: ruleId! } : {}),
    rule_name: ruleName,
    rule_type: ruleType as BusinessRuleWritePayload['rule_type'],
    priority,
    enabled,
    営業所: office,
    conditions,
    actions,
    description
  };
}
