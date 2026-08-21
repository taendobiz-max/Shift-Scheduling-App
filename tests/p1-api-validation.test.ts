import { describe, expect, it } from 'vitest';
import { sanitizeBusinessRulePayload } from '../api-server/businessRuleValidation';

process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-server-key';

const { ConstraintEngine } = await import('../api-server/constraintEngine');

describe('P1 business rule DTO validation', () => {
  it('accepts only documented fields and discards unknown fields', () => {
    const payload = sanitizeBusinessRulePayload({
      rule_id: 'rule-001',
      rule_name: 'テストルール',
      rule_type: 'constraint_check',
      priority: 10,
      enabled: true,
      営業所: '東京',
      conditions: { threshold: 1 },
      actions: { reject: true },
      description: 'テスト用',
      created_at: '2099-01-01T00:00:00Z',
      unexpected_privileged_field: true,
    }, true);

    expect(payload).toEqual({
      rule_id: 'rule-001',
      rule_name: 'テストルール',
      rule_type: 'constraint_check',
      priority: 10,
      enabled: true,
      営業所: '東京',
      conditions: { threshold: 1 },
      actions: { reject: true },
      description: 'テスト用',
    });
    expect(payload).not.toHaveProperty('unexpected_privileged_field');
  });

  it('rejects missing required fields and invalid types', () => {
    expect(sanitizeBusinessRulePayload({ rule_name: '不足' }, true)).toBeNull();
    expect(sanitizeBusinessRulePayload({
      rule_id: 'rule-002', rule_name: '不正', rule_type: 'unknown', priority: 10,
      enabled: true, 営業所: null, conditions: {}, actions: {}, description: null,
    }, true)).toBeNull();
  });
});

describe('P1 mandatory rule fail-safe and explanation', () => {
  it('marks an unsupported mandatory rule as blocked before generation', () => {
    const engine = new ConstraintEngine();
    const rule = {
      id: 'mandatory-unsupported',
      constraint_name: '未実装の必須制約',
      constraint_type: 'allowance_balance',
      priority_level: 50,
      enforcement_level: 'mandatory',
      is_active: true,
    };
    (engine as any).constraints = [rule];
    (engine as any).unsupportedConstraints = [rule];

    expect(engine.getUnsupportedMandatoryConstraints()).toHaveLength(1);
    expect(engine.getRuleExecutionReport([])).toMatchObject([{
      rule_id: 'mandatory-unsupported',
      implementation_status: 'unsupported',
      outcome: 'blocked_before_generation',
    }]);
  });

  it('blocks a direct mandatory violation regardless of priority value', async () => {
    const engine = new ConstraintEngine();
    const rule = {
      id: 'max-shifts-mandatory',
      constraint_name: '必須の最大シフト数',
      constraint_type: 'max_shifts_per_day',
      constraint_value: 1,
      priority_level: 50,
      enforcement_level: 'mandatory',
      is_active: true,
    };
    (engine as any).constraints = [rule];
    (engine as any).unsupportedConstraints = [];

    const result = await engine.validateShiftAssignment(
      { id: 'emp-1', name: 'テスト従業員', location: '東京' },
      { shift_date: '2026-08-21', employee_id: 'emp-1', business_group: 'B', start_time: '10:00', end_time: '12:00' },
      [{ shift_date: '2026-08-21', employee_id: 'emp-1', business_group: 'A', start_time: '08:00', end_time: '09:00' }],
    );

    expect(result.canProceed).toBe(false);
    expect(engine.getRuleExecutionReport(result.violations)).toMatchObject([{
      rule_id: 'max-shifts-mandatory',
      implementation_status: 'direct',
      outcome: 'violated',
      violation_count: 1,
    }]);
  });
});
