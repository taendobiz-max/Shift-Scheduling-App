// 休暇管理関連の型定義
export interface VacationMaster {
  id: string;
  employee_id: string;
  employee_name: string;
  location: string;
  vacation_date: string;
  reason: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VacationRequest {
  employee_id: string;
  employee_name: string;
  location: string;
  vacation_date: string;
  reason: string;
}

export interface VacationFormData {
  location: string;
  employee_id: string;
  employee_name: string;
  vacation_date: string;
  reason: string;
}