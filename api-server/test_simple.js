const { generateShifts } = require("./dist/shiftGenerator");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: employees } = await supabase.from("employees").select("*").eq("office", "東京").limit(10);
  const { data: businesses } = await supabase.from("business_master").select("*").eq("営業所", "東京");
  
  const result = await generateShifts(employees, businesses, ["2025-12-01", "2025-12-02"], {}, "東京");
  
  console.log("Total:", result.shifts.length);
  console.log("Sample:", JSON.stringify(result.shifts[0], null, 2));
}

test().catch(console.error);
