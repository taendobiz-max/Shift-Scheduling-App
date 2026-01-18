import * as XLSX from 'xlsx';

export interface SkillData {
  [key: string]: string;
}

export const loadSkillsFromExcel = async (): Promise<SkillData[]> => {
  try {
    // Load the skill matrix data from the uploaded Excel file
    const response = await fetch('/workspace/uploads/スキルマスタ.xlsx');
    if (!response.ok) {
      console.warn('スキルマスタ.xlsx not found, using default data');
      return getDefaultSkillsData();
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      return getDefaultSkillsData();
    }
    
    // Get headers from first row
    const headers = jsonData[0] as string[];
    
    // Convert rows to objects
    const skillsData: SkillData[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (row && row.length > 0) {
        const skillEntry: SkillData = {};
        headers.forEach((header, index) => {
          skillEntry[header] = row[index] || '';
        });
        skillsData.push(skillEntry);
      }
    }
    
    return skillsData;
  } catch (error) {
    console.error('Error loading skills from Excel:', error);
    return getDefaultSkillsData();
  }
};

const getDefaultSkillsData = (): SkillData[] => {
  // Return川越営業所 skill matrix data
  return [
    {
      '従業員番号': 'K001',
      '氏名': '田中太郎',
      '拠点': '川越',
      '職位': '運転手',
      '入社日': '2020-04-01',
      'ちふれ①': '◎',
      'ちふれ②': '○',
      'ちふれ③': '△',
      'ちふれ④': '○',
      'ちふれ⑤': '◎',
      'ちふれ⑥': '○',
      'ちふれ⑦': '△',
      'ちふれ⑧': '○',
      'ちふれ⑨': '◎',
      'ちふれ⑩': '○',
      '路線①': '◎',
      '路線②': '○',
      '路線③': '△',
      '路線④': '○',
      '路線⑤': '◎',
      '路線⑥': '○',
      '路線⑦': '△',
      '路線⑧': '○',
      '路線⑨': '◎',
      '路線⑩': '○',
      '貸切①': '○',
      '貸切②': '△',
      '貸切③': '○',
      '貸切④': '◎'
    },
    {
      '従業員番号': 'K002',
      '氏名': '佐藤花子',
      '拠点': '川越',
      '職位': '運転手',
      '入社日': '2019-07-15',
      'ちふれ①': '○',
      'ちふれ②': '◎',
      'ちふれ③': '○',
      'ちふれ④': '△',
      'ちふれ⑤': '○',
      'ちふれ⑥': '◎',
      'ちふれ⑦': '○',
      'ちふれ⑧': '△',
      'ちふれ⑨': '○',
      'ちふれ⑩': '◎',
      '路線①': '○',
      '路線②': '◎',
      '路線③': '○',
      '路線④': '△',
      '路線⑤': '○',
      '路線⑥': '◎',
      '路線⑦': '○',
      '路線⑧': '△',
      '路線⑨': '○',
      '路線⑩': '◎',
      '貸切①': '△',
      '貸切②': '○',
      '貸切③': '◎',
      '貸切④': '○'
    },
    {
      '従業員番号': 'T001',
      '氏名': '鈴木一郎',
      '拠点': '東京',
      '職位': '運転手',
      '入社日': '2021-03-01',
      'ちふれ①': '△',
      'ちふれ②': '○',
      'ちふれ③': '◎',
      'ちふれ④': '○'
    },
    {
      '従業員番号': 'T002',
      '氏名': '山田美咲',
      '拠点': '東京',
      '職位': '運転手',
      '入社日': '2022-01-10',
      'ちふれ①': '○',
      'ちふれ②': '△',
      'ちふれ③': '○',
      'ちふれ④': '◎'
    }
  ];
};

export default loadSkillsFromExcel;