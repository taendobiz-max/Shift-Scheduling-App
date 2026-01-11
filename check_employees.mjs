import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xtjhqfqfbpqxfvfgdqtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0amhxZnFmYnBxeGZ2ZmdkcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3OTQ2NzMsImV4cCI6MjA1MTM3MDY3M30.Rz7cJ0VGKtZNwJO6OP0hnQOPOGNtKDmSIIBBWPGWHSk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  console.log('🔍 Searching for specified employees...\n');
  
  const targetEmployees = {
    '東京': ['金井', '西岡', '上野', '小林淳一'],
    '川越': ['福井', '五十嵐', '島袋', '飯濱', '今井'],
    '川口': ['佐藤', '木野', '二杉']
  };
  
  for (const [location, names] of Object.entries(targetEmployees)) {
    console.log(`\n📍 ${location}拠点:`);
    const { data, error } = await supabase
      .from('employee_masters')
      .select('従業員id, 氏名, 拠点')
      .eq('拠点', location)
      .order('従業員id');
    
    if (error) {
      console.error(`Error: ${error.message}`);
      continue;
    }
    
    if (data && data.length > 0) {
      const found = [];
      const notFound = [];
      
      names.forEach(targetName => {
        const employee = data.find(emp => emp.氏名 && emp.氏名.includes(targetName));
        if (employee) {
          found.push({ name: targetName, id: employee.従業員id, fullName: employee.氏名 });
        } else {
          notFound.push(targetName);
        }
      });
      
      if (found.length > 0) {
        console.log('  ✅ 見つかったメンバー:');
        found.forEach(emp => {
          console.log(`     ${emp.id} - ${emp.fullName}`);
        });
      }
      
      if (notFound.length > 0) {
        console.log('  ❌ 見つからなかったメンバー:', notFound.join(', '));
        console.log('  💡 該当拠点の全メンバー:');
        data.forEach(emp => {
          console.log(`     ${emp.従業員id} - ${emp.氏名}`);
        });
      }
    } else {
      console.log(`  ⚠️ ${location}拠点のデータがありません`);
    }
  }
}

checkEmployees().catch(console.error);
