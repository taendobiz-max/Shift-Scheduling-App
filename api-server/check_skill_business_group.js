const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSkills() {
  const { data, error } = await supabase
    .from('skill_matrix')
    .select('business_group')
    .ilike('skill_name', '%STD%')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('STD skill business_groups:');
    const uniqueGroups = [...new Set(data.map(d => d.business_group))];
    uniqueGroups.forEach(g => {
      console.log('  -', g);
    });
  }
}

checkSkills();
