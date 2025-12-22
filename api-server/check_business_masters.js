const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBusinessMasters() {
  console.log("🔍 Checking business masters for 東京...\n");

  const { data: businesses, error } = await supabase
    .from("business_master")
    .select("*")
    .eq("営業所", "東京")
    .order("業務id");

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  console.log(`Found ${businesses.length} businesses\n`);

  // Group by type
  const multiDay = businesses.filter(b => b.運行日数 === 2);
  const singleDay = businesses.filter(b => b.運行日数 !== 2);

  console.log(`📊 Multi-day businesses: ${multiDay.length}`);
  multiDay.forEach(b => {
    console.log(`  ${b.業務id}: ${b.業務名}`);
    console.log(`    営業所: ${b.営業所}`);
    console.log(`    業務タイプ: ${b.業務タイプ}`);
    console.log(`    運行日数: ${b.運行日数}`);
    console.log(`    開始時刻: ${b.開始時刻}`);
    console.log(`    終了時刻: ${b.終了時刻}`);
    console.log(`    location_id: ${b.location_id}`);
    console.log(`    id: ${b.id}`);
    console.log();
  });

  console.log(`📊 Single-day businesses: ${singleDay.length}`);
  if (singleDay.length > 0) {
    const sample = singleDay[0];
    console.log(`  Sample: ${sample.業務id}: ${sample.業務名}`);
    console.log(`    営業所: ${sample.営業所}`);
    console.log(`    業務タイプ: ${sample.業務タイプ}`);
    console.log(`    location_id: ${sample.location_id}`);
    console.log(`    id: ${sample.id}`);
  }
}

checkBusinessMasters();
