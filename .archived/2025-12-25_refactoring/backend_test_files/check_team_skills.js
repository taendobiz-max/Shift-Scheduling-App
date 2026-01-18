const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get Galaxy and Aube team employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('employee_id, name, 班')
    .eq('office', '東京')
    .in('班', ['Galaxy', 'Aube'])
    .order('班');
  
  if (empError) {
    console.error('Error:', empError);
    return;
  }
  
  console.log(`Found ${employees.length} employees in Galaxy/Aube teams\n`);
  
  // Check their skills
  const employeeIds = employees.map(e => e.employee_id);
  const { data: skills, error: skillError } = await supabase
    .from('skill_matrix')
    .select('employee_id, business_group')
    .in('employee_id', employeeIds);
  
  if (skillError) {
    console.error('Skill error:', skillError);
    return;
  }
  
  // Group skills by employee
  const skillMap = new Map();
  skills.forEach(s => {
    if (!skillMap.has(s.employee_id)) {
      skillMap.set(s.employee_id, new Set());
    }
    skillMap.get(s.employee_id).add(s.business_group);
  });
  
  // Check each employee
  const targetGroup = 'ロジスティード東日本A';
  let galaxyWithSkill = 0;
  let aubeWithSkill = 0;
  
  console.log('Employee skills check:\n');
  employees.forEach(emp => {
    const empSkills = skillMap.get(emp.employee_id);
    const hasTargetSkill = empSkills && empSkills.has(targetGroup);
    
    console.log(`${emp.name} (${emp.班}):`);
    if (empSkills) {
      console.log(`  Skills: ${Array.from(empSkills).join(', ')}`);
      console.log(`  Has ${targetGroup}: ${hasTargetSkill ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log(`  Skills: NONE`);
    }
    console.log('');
    
    if (hasTargetSkill) {
      if (emp.班 === 'Galaxy') galaxyWithSkill++;
      if (emp.班 === 'Aube') aubeWithSkill++;
    }
  });
  
  console.log(`\nSummary:`);
  console.log(`  Galaxy team with ${targetGroup} skill: ${galaxyWithSkill}/${employees.filter(e => e.班 === 'Galaxy').length}`);
  console.log(`  Aube team with ${targetGroup} skill: ${aubeWithSkill}/${employees.filter(e => e.班 === 'Aube').length}`);
})();
