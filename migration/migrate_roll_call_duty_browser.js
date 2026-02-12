// ブラウザコンソールで実行するデータ移行スクリプト
// roll_call_duty='1'の従業員をroll_call_capable=trueに移行

async function migrateRollCallDuty() {
  console.log('🚀 Starting roll_call_duty migration...');
  
  try {
    // Step 1: roll_call_duty='1'の従業員を取得
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .eq('roll_call_duty', '1');
    
    if (fetchError) {
      console.error('❌ Error fetching employees:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${employees.length} employees with roll_call_duty='1'`);
    
    if (employees.length === 0) {
      console.log('✅ No employees to migrate');
      return;
    }
    
    // Step 2: 各従業員のroll_call_capableをtrueに更新
    let successCount = 0;
    let errorCount = 0;
    
    for (const emp of employees) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ roll_call_capable: true })
        .eq('employee_id', emp.employee_id);
      
      if (updateError) {
        console.error(`❌ Error updating employee ${emp.employee_id}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Updated employee ${emp.employee_id} (${emp.name})`);
        successCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Error: ${errorCount}`);
    console.log(`   📝 Total: ${employees.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with errors');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during migration:', error);
  }
}

// 実行
migrateRollCallDuty();
