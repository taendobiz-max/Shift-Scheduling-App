// 休暇管理関連の型定義

// 休暇種別の型定義
export type VacationType = '指定休' | '希望休' | '有給休暇';

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
