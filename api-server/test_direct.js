const { generateShifts } = require('./shiftGenerator');

async function test() {
  console.log('🧪 Testing direct import...');
  const result = await generateShifts([], [], '2025-12-20', {}, '東京営業所');
  console.log('✅ Result:', result);
}

test().catch(console.error);
