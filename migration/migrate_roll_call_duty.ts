/**
 * roll_call_dutyフィールドからskill_matrixへのデータ移行スクリプト
 * 
 * このスクリプトは以下の処理を行います:
 * 1. roll_call_duty='1'の従業員を取得
 * 2. 各従業員の所属営業所に関連する点呼業務グループを取得
 * 3. skill_matrixテーブルに点呼スキルを登録（既存のスキルは上書きしない）
 * 4. roll_call_capableフィールドをtrueに更新
 */

import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  office: string;
  roll_call_duty: string;
  roll_call_capable: boolean | null;
}

interface BusinessGroup {
  id: string;
  group_name: string;
  office: string;
}

interface SkillMatrix {
  employee_id: string;
  business_group_id: string;
  has_skill: boolean;
}

async function migrateRollCallDuty() {
  console.log('=== roll_call_dutyフィールドからskill_matrixへのデータ移行を開始 ===\n');

  try {
    // 1. roll_call_duty='1'の従業員を取得
    console.log('1. roll_call_duty="1"の従業員を取得中...');
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_id, name, office, roll_call_duty, roll_call_capable')
      .eq('roll_call_duty', '1');

    if (employeesError) {
      throw new Error(`従業員の取得に失敗: ${employeesError.message}`);
    }

    if (!employees || employees.length === 0) {
      console.log('✅ roll_call_duty="1"の従業員が見つかりませんでした。移行は不要です。');
      return;
    }

    console.log(`   見つかった従業員数: ${employees.length}人\n`);

    // 2. 点呼業務グループを取得
    console.log('2. 点呼業務グループを取得中...');
    const { data: businessGroups, error: businessGroupsError } = await supabase
      .from('business_groups')
      .select('id, group_name, office')
      .like('group_name', '%点呼%');

    if (businessGroupsError) {
      throw new Error(`業務グループの取得に失敗: ${businessGroupsError.message}`);
    }

    if (!businessGroups || businessGroups.length === 0) {
      throw new Error('点呼業務グループが見つかりませんでした。');
    }

    console.log(`   見つかった点呼業務グループ数: ${businessGroups.length}件\n`);

    // 営業所ごとの点呼業務グループをマップ化
    const officeToBusinessGroups = new Map<string, BusinessGroup[]>();
    for (const bg of businessGroups) {
      if (!officeToBusinessGroups.has(bg.office)) {
        officeToBusinessGroups.set(bg.office, []);
      }
      officeToBusinessGroups.get(bg.office)!.push(bg);
    }

    // 3. 各従業員に対してスキルを登録
    console.log('3. 各従業員に対してスキルを登録中...\n');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      console.log(`   処理中: ${employee.name} (${employee.employee_id}) - ${employee.office}`);

      // 従業員の所属営業所に関連する点呼業務グループを取得
      const relatedBusinessGroups = officeToBusinessGroups.get(employee.office) || [];

      if (relatedBusinessGroups.length === 0) {
        console.log(`     ⚠️  ${employee.office}に関連する点呼業務グループが見つかりませんでした`);
        skipCount++;
        continue;
      }

      // 既存のスキルを確認
      const { data: existingSkills, error: existingSkillsError } = await supabase
        .from('skill_matrix')
        .select('business_group_id, has_skill')
        .eq('employee_id', employee.id)
        .in('business_group_id', relatedBusinessGroups.map(bg => bg.id));

      if (existingSkillsError) {
        console.log(`     ❌ 既存スキルの確認に失敗: ${existingSkillsError.message}`);
        errorCount++;
        continue;
      }

      const existingSkillIds = new Set(existingSkills?.map(s => s.business_group_id) || []);

      // 新しいスキルを登録
      const newSkills: SkillMatrix[] = [];
      for (const bg of relatedBusinessGroups) {
        if (!existingSkillIds.has(bg.id)) {
          newSkills.push({
            employee_id: employee.id,
            business_group_id: bg.id,
            has_skill: true,
          });
          console.log(`     ✅ スキル追加: ${bg.group_name}`);
        } else {
          console.log(`     ⏭️  スキル既存: ${bg.group_name}`);
        }
      }

      if (newSkills.length > 0) {
        const { error: insertError } = await supabase
          .from('skill_matrix')
          .insert(newSkills);

        if (insertError) {
          console.log(`     ❌ スキルの登録に失敗: ${insertError.message}`);
          errorCount++;
          continue;
        }
      }

      // roll_call_capableをtrueに更新
      if (!employee.roll_call_capable) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ roll_call_capable: true })
          .eq('id', employee.id);

        if (updateError) {
          console.log(`     ⚠️  roll_call_capableの更新に失敗: ${updateError.message}`);
        } else {
          console.log(`     ✅ roll_call_capable を true に更新`);
        }
      }

      successCount++;
      console.log('');
    }

    // 4. 結果サマリー
    console.log('\n=== 移行結果サマリー ===');
    console.log(`✅ 成功: ${successCount}人`);
    console.log(`⏭️  スキップ: ${skipCount}人`);
    console.log(`❌ エラー: ${errorCount}人`);
    console.log(`合計: ${employees.length}人\n`);

    if (successCount === employees.length) {
      console.log('🎉 すべての従業員のデータ移行が完了しました！');
    } else if (errorCount > 0) {
      console.log('⚠️  一部の従業員のデータ移行に失敗しました。エラーログを確認してください。');
    }

  } catch (error) {
    console.error('❌ データ移行中にエラーが発生しました:', error);
    throw error;
  }
}

// スクリプトの実行
if (require.main === module) {
  migrateRollCallDuty()
    .then(() => {
      console.log('\n✅ スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ スクリプトの実行に失敗しました:', error);
      process.exit(1);
    });
}

export { migrateRollCallDuty };
