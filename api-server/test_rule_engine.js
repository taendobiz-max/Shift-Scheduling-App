require('dotenv/config');
const { BusinessRuleEngine } = require('./BusinessRuleEngine');

async function testRuleEngine() {
  console.log('🧪 Testing Business Rule Engine...');
  console.log('');
  
  // Initialize rule engine
  const engine = new BusinessRuleEngine(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Load rules for Tokyo
  await engine.loadRules('東京営業所');
  console.log('');
  
  // Test context for overnight bus (Galaxy/Aube rotation)
  const context1 = {
    business: {
      業務名: '東京仙台便（往路）',
      業務グループ: '夜行バス',
      業務タイプ: '夜行バス',
      班指定: null,
      ペア業務ID: 'PAIR_TN_SS01',
      運行日数: 2,
      方向: '往路'
    },
    date: '2025-12-20',  // Even day
    location: '東京営業所',
    availableEmployees: [
      { employee_id: '00001001', name: 'テスト従業員A', 班: 'Galaxy', 営業所: '東京営業所' },
      { employee_id: '00001002', name: 'テスト従業員B', 班: 'Aube', 営業所: '東京営業所' },
      { employee_id: '00001003', name: 'テスト従業員C', 班: 'その他', 営業所: '東京営業所' }
    ],
    existingShifts: []
  };
  
  console.log('📋 Test 1: Overnight bus rotation (Even day)');
  console.log('  Business:', context1.business.業務名);
  console.log('  Date:', context1.date);
  console.log('  Available employees:', context1.availableEmployees.length);
  
  const filtered1 = await engine.filterEmployees(context1);
  console.log('  Filtered employees:', filtered1.length);
  filtered1.forEach(emp => {
    console.log(`    - ${emp.name} (${emp.班})`);
  });
  console.log('');
  
  // Test context for odd day
  const context2 = {
    ...context1,
    date: '2025-12-21'  // Odd day
  };
  
  console.log('📋 Test 2: Overnight bus rotation (Odd day)');
  console.log('  Business:', context2.business.業務名);
  console.log('  Date:', context2.date);
  
  const filtered2 = await engine.filterEmployees(context2);
  console.log('  Filtered employees:', filtered2.length);
  filtered2.forEach(emp => {
    console.log(`    - ${emp.name} (${emp.班})`);
  });
  console.log('');
  
  console.log('✅ Rule engine test completed');
}

testRuleEngine().catch(console.error);
