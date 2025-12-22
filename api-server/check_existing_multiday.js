const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('business_master')
    .select('業務id, 業務名, 運行日数, 方向, 班指定, 営業所, 業務グループ')
    .eq('運行日数', 2)
    .order('業務id');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Multi-day businesses (運行日数=2): ${data.length}\n`);
    
    // Group by base name
    const pairs = {};
    data.forEach(b => {
      const baseName = b.業務名.replace(/（往路）|（復路）/g, '').trim();
      if (!pairs[baseName]) {
        pairs[baseName] = { outbound: null, return: null };
      }
      if (b.方向 === 'outbound') {
        pairs[baseName].outbound = b;
      } else if (b.方向 === 'return') {
        pairs[baseName].return = b;
      }
    });
    
    console.log('Business pairs:\n');
    Object.keys(pairs).forEach(baseName => {
      const pair = pairs[baseName];
      console.log(`${baseName}:`);
      if (pair.outbound) {
        console.log(`  往路: ${pair.outbound.業務id}`);
        console.log(`    班指定: ${pair.outbound.班指定 || 'なし'}`);
        console.log(`    業務グループ: ${pair.outbound.業務グループ}`);
      }
      if (pair.return) {
        console.log(`  復路: ${pair.return.業務id}`);
        console.log(`    班指定: ${pair.return.班指定 || 'なし'}`);
        console.log(`    業務グループ: ${pair.return.業務グループ}`);
      }
      console.log('');
    });
  }
})();
