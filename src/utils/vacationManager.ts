import { VacationMaster, VacationRequest } from '@/types/vacation';
import { apiFetch } from './apiClient';

interface VacationListOptions {
  startDate?: string;
  endDate?: string;
  location?: string;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || '休暇データの処理に失敗しました。');
  }
  return body as T;
}

export class VacationManager {
  private static async getVacations(options: VacationListOptions = {}): Promise<VacationMaster[]> {
    const query = new URLSearchParams();
    if (options.startDate) query.set('startDate', options.startDate);
    if (options.endDate) query.set('endDate', options.endDate);
    if (options.location) query.set('location', options.location);

    const response = await apiFetch(`/api/vacations${query.size ? `?${query}` : ''}`);
    const body = await parseApiResponse<{ vacations: VacationMaster[] }>(response);
    return body.vacations ?? [];
  }

  static async getVacationsByDateRange(startDate: string, endDate: string): Promise<VacationMaster[]> {
    return this.getVacations({ startDate, endDate });
  }

  static async getVacationsByLocation(location: string): Promise<VacationMaster[]> {
    return this.getVacations({ location });
  }

  static async getAllVacations(): Promise<VacationMaster[]> {
    return this.getVacations();
  }

  static async createVacation(vacation: VacationRequest): Promise<VacationMaster> {
    const created = await this.createVacationRange([vacation]);
    return created[0];
  }

  /**
   * 複数日の休暇を1回のAPI要求で登録する。サーバー側で単一insertとして実行され、
   * 日付重複などで失敗した場合は全日付を登録しない。
   */
  static async createVacationRange(vacations: VacationRequest[]): Promise<VacationMaster[]> {
    const response = await apiFetch('/api/vacations/bulk', {
      method: 'POST',
      body: JSON.stringify({ vacations }),
    });
    const body = await parseApiResponse<{ vacations: VacationMaster[] }>(response);
    return body.vacations ?? [];
  }

  static async updateVacation(id: string, vacation: Partial<VacationRequest>): Promise<VacationMaster> {
    const response = await apiFetch(`/api/vacations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(vacation),
    });
    const body = await parseApiResponse<{ vacation: VacationMaster }>(response);
    return body.vacation;
  }

  static async deleteVacation(id: string): Promise<boolean> {
    const response = await apiFetch(`/api/vacations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await parseApiResponse<{ success: boolean }>(response);
    return true;
  }

  static async checkDuplicate(employeeId: string, vacationDate: string): Promise<boolean> {
    const vacations = await this.getVacations({ startDate: vacationDate, endDate: vacationDate });
    return vacations.some((vacation) => vacation.employee_id === employeeId);
  }

  static convertToNonWorkingMembers(vacations: VacationMaster[]) {
    return vacations.map((vacation) => ({
      id: `vacation-${vacation.id}`,
      date: vacation.vacation_date,
      employeeName: vacation.employee_name,
      employeeId: vacation.employee_id,
      reason: `【${vacation.vacation_type}】${vacation.reason}`,
      source: 'vacation_master' as const,
    }));
  }
}
