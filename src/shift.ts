// シフト関連の型定義

export interface Employee {
  id: string;
  name: string;
  office: string;
  // その他の従業員情報
}

export interface Business {
  id: string;
  name: string;
  required_skills?: string[];
  // その他の業務情報
}

export interface Shift {
  id: string;
  employee_id: string | null;
  business_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  // その他のシフト情報
}

export interface CellPosition {
  employeeId: string;
  employeeName?: string;
  businessId: string;
  businessName?: string;
  date: string;
  shiftId?: string;
}

export interface SwapOperation {
  from: CellPosition;
  to: CellPosition;
}
