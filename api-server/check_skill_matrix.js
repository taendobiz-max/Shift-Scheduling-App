const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSkillMatrix() {
  console.log('Checking skill_matrix table...\n');
  
  const { data, error, count } = await supabase
    .from('skill_matrix')
    .select('*', { count: 'exact' })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total records: ${count}`);
  console.log(`Sample records (first 10):`);
  console.log(JSON.stringify(data, null, 2));
  
  // Count by skill level
  const { data: skillLevels } = await supabase
    .from('skill_matrix')
    .select('skill_level');
  
  if (skillLevels) {
    const levelCounts = {};
    skillLevels.forEach(item => {
      const level = item.skill_level || 'null';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    
    console.log('\nSkill level distribution:');
    Object.entries(levelCounts).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`);
    });
  }
}

checkSkillMatrix().catch(console.error);
