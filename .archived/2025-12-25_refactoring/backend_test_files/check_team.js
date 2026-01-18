const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTeams() {
  const { data: employees } = await supabase
    .from("employees")
    .select("name, 班")
    .eq("office", "東京")
    .limit(20);

  console.log("東京の従業員の班情報:");
  employees.forEach(emp => {
    console.log(`  ${emp.name}: 班=${emp.班 || "(未設定)"}`);
  });
  
  const galaxyCount = employees.filter(e => e.班 === "Galaxy").length;
  const aubeCount = employees.filter(e => e.班 === "Aube").length;
  const unassignedCount = employees.filter(e => !e.班).length;
  
  console.log(`\n統計:`);
  console.log(`  Galaxy: ${galaxyCount}名`);
  console.log(`  Aube: ${aubeCount}名`);
  console.log(`  未設定: ${unassignedCount}名`);
}

checkTeams();
