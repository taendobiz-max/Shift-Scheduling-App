const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDBMultiDay() {
  console.log("🔍 Checking multi_day_set_id in database...\n");

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("date, business_name, employee_id, multi_day_set_id, multi_day_info")
    .not("multi_day_set_id", "is", null)
    .order("date", { ascending: true })
    .limit(20);

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  console.log(`Found ${shifts.length} shifts with multi_day_set_id:\n`);
  
  shifts.forEach(shift => {
    console.log(`📅 ${shift.date}: ${shift.business_name} (Employee: ${shift.employee_id || "N/A"})`);
    console.log(`   Set ID: ${shift.multi_day_set_id}`);
    if (shift.multi_day_info) {
      console.log(`   Info: ${JSON.stringify(shift.multi_day_info)}`);
    }
    console.log();
  });
}

checkDBMultiDay();
