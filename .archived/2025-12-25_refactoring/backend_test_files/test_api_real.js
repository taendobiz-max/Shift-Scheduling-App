const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: employees } = await supabase.from("employees").select("*").eq("office", "東京").limit(10);
  const { data: businesses } = await supabase.from("business_master").select("*").eq("営業所", "東京").limit(5);
  
  console.log("Employees:", employees.length);
  console.log("Businesses:", businesses.length);
  console.log("Sample business:", JSON.stringify(businesses[0], null, 2));
  
  const response = await axios.post("http://localhost:3001/api/generate-shifts", {
    employees,
    businessMasters: businesses,
    dateRange: ["2025-12-01", "2025-12-02"],
    pairGroups: {},
    location: "東京"
  });
  
  console.log("Success:", response.data.success);
  console.log("Shifts:", response.data.shifts.length);
  console.log("Multi-day:", response.data.shifts.filter(s => s.multi_day_set_id).length);
  if (response.data.shifts.length > 0) {
    console.log("Sample:", JSON.stringify(response.data.shifts[0], null, 2));
  }
}

test().catch(console.error);
