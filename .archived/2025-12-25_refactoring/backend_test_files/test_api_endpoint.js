const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: employees } = await supabase.from("employees").select("*").eq("office", "東京").limit(10);
  const { data: businesses } = await supabase.from("business_master").select("*").eq("営業所", "東京");
  
  const response = await axios.post("http://localhost:4000/api/generate-shifts", {
    employees,
    businessMasters: businesses,
    dateRange: ["2025-12-01", "2025-12-02"],
    pairGroups: {},
    location: "東京"
  });
  
  console.log("Total shifts:", response.data.shifts.length);
  const multiDay = response.data.shifts.filter(s => s.multi_day_set_id);
  console.log("Multi-day shifts:", multiDay.length);
  if (multiDay.length > 0) {
    console.log("Sample:", JSON.stringify(multiDay[0], null, 2));
  }
}

test().catch(console.error);
