const mysql = require('mysql2/promise');

async function checkMultiDayShifts() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Bp9kNmR7sT3vLqW2',
    database: 'shift_management'
  });

  try {
    console.log('🔍 Checking multi-day shifts in database...\n');

    // Get recent shifts with multi_day_set_id
    const [shifts] = await connection.execute(`
      SELECT 
        id,
        employee_id,
        business_id,
        date,
        multi_day_set_id,
        multi_day_info,
        location
      FROM shifts
      WHERE location = '東京'
        AND date >= '2025-11-01'
        AND date <= '2025-11-07'
      ORDER BY date, employee_id
      LIMIT 50
    `);

    console.log(`📊 Total shifts found: ${shifts.length}\n`);

    // Count multi-day shifts
    const multiDayShifts = shifts.filter(s => s.multi_day_set_id);
    console.log(`🔗 Shifts with multi_day_set_id: ${multiDayShifts.length}\n`);

    if (multiDayShifts.length > 0) {
      console.log('📋 Multi-day shifts details:');
      multiDayShifts.forEach(shift => {
        console.log(`  - Date: ${shift.date}, Employee: ${shift.employee_id}, Set ID: ${shift.multi_day_set_id}`);
        if (shift.multi_day_info) {
          console.log(`    Info: ${JSON.stringify(shift.multi_day_info)}`);
        }
      });
    } else {
      console.log('⚠️ No multi-day shifts found!');
      console.log('\nSample of regular shifts:');
      shifts.slice(0, 10).forEach(shift => {
        console.log(`  - Date: ${shift.date}, Employee: ${shift.employee_id}, Business: ${shift.business_id}`);
      });
    }

    // Check business masters for 2-day businesses
    console.log('\n🔍 Checking business masters for 2-day businesses...\n');
    const [businesses] = await connection.execute(`
      SELECT 
        業務id,
        業務名,
        運行日数,
        location
      FROM business_masters
      WHERE location = '東京'
        AND 運行日数 = 2
      LIMIT 10
    `);

    console.log(`📊 2-day businesses in Tokyo: ${businesses.length}`);
    if (businesses.length > 0) {
      businesses.forEach(b => {
        console.log(`  - ${b.業務名} (${b.業務id})`);
      });
    } else {
      console.log('⚠️ No 2-day businesses found in Tokyo!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMultiDayShifts();
