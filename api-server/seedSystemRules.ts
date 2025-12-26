/**
 * システムルールをunified_shift_rulesテーブルに追加するスクリプト
 * 
 * ハードコードされていた制約をDBに外部化
 */

import { supabase } from './supabaseClient';

interface SystemRule {
  rule_name: string;
  rule_category: string;
  description: string;
  applicable_locations: string[];
  rule_type: string;
  rule_config: Record<string, any>;
  priority_level: number;
  enforcement_level: string;
  is_active: boolean;
}

const SYSTEM_RULES: SystemRule[] = [
  {
    rule_name: '1日の最大労働時間',
    rule_category: 'work_hours',
    description: '1日の労働時間が指定時間を超えないようにする制約',
    applicable_locations: ['東京', '川越', '川口', '本社'],
    rule_type: 'constraint',
    rule_config: {
      constraint_type: 'max_daily_work_hours',
      value: 15,
      unit: 'hours',
      scope: 'day'
    },
    priority_level: 1,
    enforcement_level: 'mandatory',
    is_active: true
  },
  {
    rule_name: '1日の最大シフト数',
    rule_category: 'shift_count',
    description: '1日に割り当てられるシフト数の上限',
    applicable_locations: ['東京', '川越', '川口', '本社'],
    rule_type: 'constraint',
    rule_config: {
      constraint_type: 'max_daily_shifts',
      value: 3,
      unit: 'shifts',
      scope: 'day'
    },
    priority_level: 2,
    enforcement_level: 'mandatory',
    is_active: true
  },
  {
    rule_name: '点呼業務の排他制約',
    rule_category: 'roll_call',
    description: '点呼①早番と点呼②遅番を同じ従業員に割り当てない',
    applicable_locations: ['東京', '川越', '川口', '本社'],
    rule_type: 'constraint',
    rule_config: {
      constraint_type: 'exclusive_assignment',
      exclusive_groups: [
        ['点呼①早番', '点呼②遅番']
      ],
      scope: 'day'
    },
    priority_level: 1,
    enforcement_level: 'mandatory',
    is_active: true
  }
];

async function seedSystemRules(): Promise<void> {
  console.log('🌱 Starting to seed system rules...');
  
  for (const rule of SYSTEM_RULES) {
    try {
      // Check if rule already exists
      const { data: existing, error: checkError } = await supabase
        .from('unified_shift_rules')
        .select('id')
        .eq('rule_name', rule.rule_name)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking rule "${rule.rule_name}":`, checkError);
        continue;
      }
      
      if (existing) {
        // Update existing rule
        const { error: updateError } = await supabase
          .from('unified_shift_rules')
          .update({
            ...rule,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error(`❌ Error updating rule "${rule.rule_name}":`, updateError);
        } else {
          console.log(`✅ Updated rule: ${rule.rule_name}`);
        }
      } else {
        // Insert new rule
        const { error: insertError } = await supabase
          .from('unified_shift_rules')
          .insert(rule);
        
        if (insertError) {
          console.error(`❌ Error inserting rule "${rule.rule_name}":`, insertError);
        } else {
          console.log(`✅ Inserted rule: ${rule.rule_name}`);
        }
      }
    } catch (err) {
      console.error(`❌ Error processing rule "${rule.rule_name}":`, err);
    }
  }
  
  console.log('🌱 Finished seeding system rules');
}

// Export for use as module
export { seedSystemRules, SYSTEM_RULES };

// Run if executed directly
if (require.main === module) {
  seedSystemRules()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
