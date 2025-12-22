const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTokyoMultiDay() {
  console.log("🧪 Testing Tokyo multi-day shift generation...\n");

  // Fetch employees
  console.log("📥 Fetching Tokyo employees...");
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("*")
    .eq("office", "東京")
    .limit(10);

  if (empError) {
    console.error("❌ Error fetching employees:", empError);
    return;
  }

  console.log(`  Found ${employees.length} employees`);

  // Fetch business masters
  console.log("📥 Fetching business masters...");
  const { data: businessMasters, error: bmError } = await supabase
    .from("business_master")
    .select("*")
    .eq("営業所", "東京");

  if (bmError) {
    console.error("❌ Error fetching business masters:", bmError);
    return;
  }

  console.log(`  Found ${businessMasters.length} business masters`);

  // Check for multi-day businesses
  const multiDayByType = businessMasters.filter(b => b.業務タイプ === "multi_day");
  const multiDayByDuration = businessMasters.filter(b => b.運行日数 === 2);
  
  console.log(`  Multi-day by 業務タイプ: ${multiDayByType.length}`);
  multiDayByType.forEach(b => {
    console.log(`    - ${b.業務id}: ${b.業務名} (タイプ: ${b.業務タイプ}, 日数: ${b.運行日数})`);
  });
  
  console.log(`  Multi-day by 運行日数: ${multiDayByDuration.length}`);
  multiDayByDuration.forEach(b => {
    console.log(`    - ${b.業務id}: ${b.業務名} (タイプ: ${b.業務タイプ}, 日数: ${b.運行日数})`);
  });

  // Call generateShifts
  console.log("\n📞 Calling generateShifts function...");
  const { generateShifts } = require("./shiftGenerator");

  const result = await generateShifts(
    employees,
    businessMasters,
    ["2025-01-20", "2025-01-21"],
    {},
    "東京"
  );

  console.log("\n✅ Generation complete");
  console.log(`  Total shifts: ${result.shifts.length}`);
  console.log(`  Success: ${result.success}`);

  // Check for multi_day_set_id
  const shiftsWithSetId = result.shifts.filter(s => s.multi_day_set_id);
  console.log(`  Shifts with multi_day_set_id: ${shiftsWithSetId.length}`);

  if (shiftsWithSetId.length > 0) {
    console.log("\n  Multi-day shift details:");
    shiftsWithSetId.forEach(shift => {
      console.log(`    - ${shift.date}: ${shift.business_name} (${shift.employee_name || "N/A"})`);
      console.log(`      Set ID: ${shift.multi_day_set_id}`);
      if (shift.multi_day_info) {
        console.log(`      Day: ${shift.multi_day_info.day} / ${shift.multi_day_info.total_days}`);
      }
    });
  }
}

testTokyoMultiDay().catch(console.error);
