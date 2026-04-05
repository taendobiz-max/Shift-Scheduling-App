import { supabase } from './supabaseClient';

/**
 * 休暇除外ルールをunified_shift_rulesテーブルに追加
 */
async function addVacationRule() {
  console.log('🔧 Adding vacation exclusion rule to unified_shift_rules...');

  const vacationRule = {
    rule_name: '休暇申請者の除外',
    rule_category: 'vacation',
    description: '休暇申請済みの従業員をシフトにアサインしない制約',
    applicable_locations: ['東京', '川越', '川口', '本社'], // 全営業所共通
    rule_type: 'constraint',
    rule_config: {
      constraint_type: 'vacation_exclusion',
      check_table: 'vacation_masters',
      check_field: 'vacation_date'
    },
    priority_level: 0, // 最高優先度（他のルールより先にチェック）
    enforcement_level: 'mandatory',
    is_active: true
  };

  try {
    // 既存のルールを確認
    const { data: existing, error: checkError } = await supabase
      .from('unified_shift_rules')
      .select('id')
      .eq('rule_name', vacationRule.rule_name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing rule:', checkError);
      return;
    }

    if (existing) {
      console.log('⚠️ Vacation exclusion rule already exists, updating...');
      const { error: updateError } = await supabase
        .from('unified_shift_rules')
        .update(vacationRule)
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ Error updating rule:', updateError);
        return;
      }
      console.log('✅ Vacation exclusion rule updated');
    } else {
      console.log('➕ Inserting new vacation exclusion rule...');
      const { error: insertError } = await supabase
        .from('unified_shift_rules')
        .insert([vacationRule]);

      if (insertError) {
        console.error('❌ Error inserting rule:', insertError);
        return;
      }
      console.log('✅ Vacation exclusion rule added');
    }

    // 確認
    const { data: allRules, error: selectError } = await supabase
      .from('unified_shift_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority_level', { ascending: true });

    if (selectError) {
      console.error('❌ Error fetching rules:', selectError);
      return;
    }

    console.log('\n📋 Current active rules:');
    allRules?.forEach((rule: any) => {
      console.log(`  ${rule.priority_level}. ${rule.rule_name} (${rule.rule_category})`);
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// 実行
addVacationRule()
  .then(() => {
    console.log('\n✅ Vacation rule setup complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed to add vacation rule:', err);
    process.exit(1);
  });
