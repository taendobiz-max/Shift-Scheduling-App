export interface CellPosition {
  employeeId: string;
  employeeName: string;
  businessId: string | null;
  businessName: string | null;
  date: string;
  shiftId?: string;
  isEmpty?: boolean;
}
