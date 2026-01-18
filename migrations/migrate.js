/**
 * 統合シフトルールテーブル作成とデータ移行スクリプト
 * 実行方法: node migrate.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local を読み込み
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase接続情報が見つかりません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('🚀 統合シフトルールシステムのマイグレーションを開始します...\n');

  try {
    // Step 1: テーブル作成（Supabase Dashboardで手動実行が必要）
    console.log('📋 Step 1: テーブル作成');
    console.log('   ⚠️  Supabase Dashboardで以下のSQLを実行してください:');
    console.log('   https://vipsfjdsspkczumuqnoi.supabase.co/project/_/sql\n');
    console.log('   SQLファイル: migrations/001_create_unified_shift_rules.sql\n');

    // テーブルが存在するか確認
    const { data: tables, error: tableError } = await supabase
      .from('unified_shift_rules')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ unified_shift_rules テーブルが見つかりません');
      console.error('   Supabase Dashboardでテーブルを作成してください');
      console.error(`   エラー: ${tableError.message}`);
      return;
    }

    console.log('✅ unified_shift_rules テーブルが存在します\n');

    // Step 2: enhanced_constraints からデータ移行
    console.log('📋 Step 2: enhanced_constraints からデータ移行');
    
    const { data: constraints, error: constraintsError } = await supabase
      .from('enhanced_constraints')
      .select('*');

    if (constraintsError) {
      console.error(`❌ enhanced_constraints の読み込みエラー: ${constraintsError.message}`);
    } else {
      console.log(`   ${constraints.length} 件の制約条件を取得しました`);

      for (const constraint of constraints) {
        // 既に移行済みかチェック
        const { data: existing } = await supabase
          .from('unified_shift_rules')
          .select('id')
          .eq('rule_name', constraint.constraint_name)
          .single();

        if (existing) {
          console.log(`   ⏭️  スキップ: ${constraint.constraint_name} (既に存在)`);
          continue;
        }

        const unifiedRule = {
          rule_name: constraint.constraint_name,
          rule_category: constraint.constraint_category,
          description: constraint.constraint_description,
          applicable_locations: constraint.applicable_locations,
          rule_type: 'constraint',
          rule_config: {
            constraint_type: constraint.constraint_type,
            value: constraint.constraint_value,
            original_table: 'enhanced_constraints',
            migrated_at: new Date().toISOString()
          },
          priority_level: constraint.priority_level,
          enforcement_level: constraint.enforcement_level,
          is_active: constraint.is_active,
          created_at: constraint.created_at
        };

        const { error: insertError } = await supabase
          .from('unified_shift_rules')
          .insert(unifiedRule);

        if (insertError) {
          console.error(`   ❌ 挿入エラー (${constraint.constraint_name}): ${insertError.message}`);
        } else {
          console.log(`   ✅ 移行完了: ${constraint.constraint_name}`);
        }
      }
    }

    console.log('');

    // Step 3: business_rules からデータ移行
    console.log('📋 Step 3: business_rules からデータ移行');
    
    const { data: businessRules, error: businessRulesError } = await supabase
      .from('business_rules')
      .select('*');

    if (businessRulesError) {
      console.error(`❌ business_rules の読み込みエラー: ${businessRulesError.message}`);
    } else {
      console.log(`   ${businessRules.length} 件のビジネスルールを取得しました`);

      for (const rule of businessRules) {
        // 既に移行済みかチェック
        const { data: existing } = await supabase
          .from('unified_shift_rules')
          .select('id')
          .eq('rule_name', rule.rule_name)
          .single();

        if (existing) {
          console.log(`   ⏭️  スキップ: ${rule.rule_name} (既に存在)`);
          continue;
        }

        // ルールタイプのマッピング
        let mappedRuleType = 'assignment';
        if (rule.rule_type === 'constraint_check') mappedRuleType = 'constraint';
        else if (rule.rule_type === 'employee_filter') mappedRuleType = 'filter';
        else if (rule.rule_type === 'pair_business') mappedRuleType = 'validation';

        const unifiedRule = {
          rule_name: rule.rule_name,
          rule_category: rule.rule_type,
          description: rule.description,
          applicable_locations: rule.営業所 ? [rule.営業所] : ['全拠点'],
          rule_type: mappedRuleType,
          rule_config: {
            conditions: rule.conditions,
            actions: rule.actions,
            original_table: 'business_rules',
            migrated_at: new Date().toISOString()
          },
          priority_level: rule.priority,
          enforcement_level: 'recommended',
          is_active: rule.enabled,
          created_at: rule.created_at
        };

        const { error: insertError } = await supabase
          .from('unified_shift_rules')
          .insert(unifiedRule);

        if (insertError) {
          console.error(`   ❌ 挿入エラー (${rule.rule_name}): ${insertError.message}`);
        } else {
          console.log(`   ✅ 移行完了: ${rule.rule_name}`);
        }
      }
    }

    console.log('');

    // Step 4: 移行結果の検証
    console.log('📋 Step 4: 移行結果の検証\n');

    const { count: unifiedCount } = await supabase
      .from('unified_shift_rules')
      .select('*', { count: 'exact', head: true });

    console.log(`   統合テーブル: ${unifiedCount} 件`);

    // ルールタイプ別の集計
    const { data: typeStats } = await supabase
      .from('unified_shift_rules')
      .select('rule_type');

    const typeCounts = {};
    typeStats?.forEach(row => {
      typeCounts[row.rule_type] = (typeCounts[row.rule_type] || 0) + 1;
    });

    console.log('\n   ルールタイプ別:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count} 件`);
    });

    console.log('\n✅ マイグレーション完了！\n');

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  }
}

migrate();
