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
  
  const response = await axios.post("http://localhost:3001/api/generate-shifts", {
    employees,
    businessMasters: businesses,
    dateRange: ["2025-12-01", "2025-12-02"],
    pairGroups: {},
    location: "東京"
  });
  
  console.log(JSON.stringify(response.data, null, 2));
}

test().catch(console.error);
