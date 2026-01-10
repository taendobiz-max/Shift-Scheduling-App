// 休暇管理関連の型定義

// 休暇種別の型定義
export type VacationType = '公休' | '私用' | '病欠' | '忌引' | 'その他';

export interface VacationMaster {
  id: string;
  employee_id: string;
  employee_name: string;
  location: string;
  vacation_date: string;
  vacation_type: VacationType;
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
  vacation_type: VacationType;
  reason: string;
}

export interface VacationFormData {
  location: string;
  employee_id: string;
  employee_name: string;
  vacation_date: string;
  vacation_type: VacationType;
  reason: string;
}
