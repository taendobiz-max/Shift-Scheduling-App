const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xtjhqfqfbpqxfvfgdqtv.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0amhxZnFmYnBxeGZ2ZmdkcXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3OTQ2NzMsImV4cCI6MjA1MTM3MDY3M30.Rz7cJ0VGKtZNwJO6OP0hnQOPOGNtKDmSIIBBWPGWHSk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  console.log('🔍 Searching for specified employees...\n');
  
  const names = [
    // 東京
    '金井', '西岡', '上野', '小林淳一',
    // 川越
    '福井', '五十嵐', '島袋', '飯濱', '今井',
    // 川口
    '佐藤', '木野', '二杉'
  ];
  
  const locations = ['東京', '川越', '川口'];
  
  for (const location of locations) {
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
      data.forEach(emp => {
        const isTarget = names.some(name => emp.氏名 && emp.氏名.includes(name));
        const marker = isTarget ? '✅' : '  ';
        console.log(`${marker} ${emp.従業員id} - ${emp.氏名}`);
      });
    }
  }
}

checkEmployees().catch(console.error);
