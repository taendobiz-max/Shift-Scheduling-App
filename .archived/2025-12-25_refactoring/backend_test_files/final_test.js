const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function finalTest() {
  console.log("🧪 Final multi-day shift generation test...\n");

  // Fetch employees
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("office", "東京")
    .limit(15);

  console.log(`👥 Employees: ${employees.length}`);

  // Fetch business masters
  const { data: businessMasters } = await supabase
    .from("business_master")
    .select("*")
    .eq("営業所", "東京");

  console.log(`🏢 Business masters: ${businessMasters.length}`);

  const multiDayBusinesses = businessMasters.filter(b => b.運行日数 === 2);
  console.log(`🚌 Multi-day businesses: ${multiDayBusinesses.length}\n`);

  // Generate shifts
  const { generateShifts } = require("./shiftGenerator");
  const result = await generateShifts(
    employees,
    businessMasters,
    ["2025-02-10", "2025-02-11", "2025-02-12"],
    {},
    "東京"
  );

  console.log("\n✅ Generation complete");
  console.log(`   Total shifts: ${result.shifts.length}`);
  console.log(`   Success: ${result.success}`);

  // Check multi-day shifts
  const multiDayShifts = result.shifts.filter(s => s.multi_day_set_id);
  console.log(`   Multi-day shifts: ${multiDayShifts.length}\n`);

  if (multiDayShifts.length > 0) {
    console.log("📊 Multi-day shift summary:");
    const setIds = new Set(multiDayShifts.map(s => s.multi_day_set_id));
    console.log(`   Unique set IDs: ${setIds.size}`);
    
    // Group by set_id
    const grouped = {};
    multiDayShifts.forEach(s => {
      if (!grouped[s.multi_day_set_id]) {
        grouped[s.multi_day_set_id] = [];
      }
      grouped[s.multi_day_set_id].push(s);
    });

    console.log("\n   Paired shifts:");
    Object.entries(grouped).forEach(([setId, shifts]) => {
      console.log(`   ${setId}:`);
      shifts.forEach(s => {
        const info = s.multi_day_info || {};
        console.log(`      Day ${info.day}/${info.total_days}: ${s.date} - ${s.business_name}`);
      });
    });
  }

  // Verify in database
  console.log("\n🔍 Verifying database...");
  const { data: dbShifts } = await supabase
    .from("shifts")
    .select("date, business_name, multi_day_set_id")
    .gte("date", "2025-02-10")
    .lte("date", "2025-02-12")
    .not("multi_day_set_id", "is", null);

  console.log(`   Found ${dbShifts.length} multi-day shifts in DB`);
  
  if (dbShifts.length > 0) {
    console.log("   ✅ Multi-day shifts successfully saved to database");
  } else {
    console.log("   ⚠️ No multi-day shifts found in database");
  }
}

finalTest().catch(console.error);
