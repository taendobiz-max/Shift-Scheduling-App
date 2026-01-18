import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkVacation() {
  const { data, error } = await supabase
    .from("vacation_masters")
    .select("*")
    .eq("vacation_date", "2025-12-26");

  console.log("vacation_masters data for 2025-12-26:", JSON.stringify(data, null, 2));
  if (error) console.error("Error:", error);
}

checkVacation();
