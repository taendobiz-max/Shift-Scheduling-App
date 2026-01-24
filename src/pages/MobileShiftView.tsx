import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, TrendingUp, Award, Smartphone, Plus, Save } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface ShiftData {
  id: string;
  date: string;
  employee_id: string;
  business_id: string;
  start_time: string;
  end_time: string;
  business_name?: string;
}

interface OvertimeData {
  total_hours: number;
  month: string;
}

interface AllowanceData {
  allowance_type: string;
  count: number;
}

interface ManualOvertimeData {
  id?: string;
  employee_id: string;
  office: string;
  date: string;
  overtime_hours: number;
  memo?: string;
}

export default function MobileShiftView() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [offices, setOffices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [overtime, setOvertime] = useState<number>(0);
  const [allowances, setAllowances] = useState<AllowanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [manualOvertimeHours, setManualOvertimeHours] = useState<number>(0);
  const [manualOvertimeMemo, setManualOvertimeMemo] = useState<string>('');
  const [savingOvertime, setSavingOvertime] = useState(false);
  const [existingOvertime, setExistingOvertime] = useState<ManualOvertimeData | null>(null);


  // ログインユーザー情報を取得
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ユーザーのメタデータから従業員IDと営業所IDを取得
        const { data: userData } = await supabase
          .from('users')
          .select('employee_id')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setCurrentUser(userData);
          setSelectedEmployee(userData.employee_id);
          
          // 従業員情報から営業所を取得
          const { data: employeeData } = await supabase
            .from('employees')
            .select('office')
            .eq('id', userData.employee_id)
            .single();
          
          if (employeeData) {
            setSelectedOffice(employeeData.office);
          }
        }
      }
    };
    fetchCurrentUser();
  }, []);

  // 営業所リストを設定（固定値）
  useEffect(() => {
    const officeList = [
      { id: '川越', name: '川越' },
      { id: '東京', name: '東京' },
      { id: '川口', name: '川口' }
    ];
    setOffices(officeList);
  }, []);

  // 従業員リストを取得（営業所でフィルタリング）
  useEffect(() => {
    if (!selectedOffice) return;
    
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('office', selectedOffice)
        .order('name');
      
      if (!error && data) {
        setEmployees(data);
      }
    };
    fetchEmployees();
  }, [selectedOffice]);

  // シフトデータを取得
  useEffect(() => {
    if (!selectedEmployee || !selectedDate) return;

    const fetchShiftData = async () => {
      setLoading(true);
      try {
        const dateStr = selectedDate;
        console.log('📅 [DEBUG] Fetching shift data:', { employee_id: selectedEmployee, date: dateStr });
        
        console.log("📅 [DEBUG] Selected employee type:", typeof selectedEmployee);
        console.log("📅 [DEBUG] Selected employee value:", selectedEmployee);
        // シフトデータを取得
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .eq('date', dateStr);
        
        console.log('📊 [DEBUG] Shift query result:', { data: shiftData, error: shiftError });
        if (shiftData && shiftData.length > 0) {
          console.log("✅ [DEBUG] Found shifts:", shiftData);
        } else {
          console.log("❌ [DEBUG] No shifts found for employee_id:", selectedEmployee, "date:", dateStr);
        }
        
        if (!shiftError && shiftData && shiftData.length > 0) {
          // business_nameは既にshiftsテーブルに含まれている
          // business_master_idを使ってbusiness_masterテーブルから時間情報を取得
          const businessIds = shiftData.map(s => s.business_master_id).filter(Boolean);
          const { data: businessData } = await supabase
            .from('business_master')
            .select('*')
            .in('業務id', businessIds);
          
          const businessMap = new Map();
          if (businessData) {
            businessData.forEach(b => {
              businessMap.set(b['業務id'], b);
            });
          }
          
          const formattedShifts = shiftData.map(shift => {
            const business = businessMap.get(shift.business_master_id);
            return {
              ...shift,
              start_time: business?.['開始時間'] || '',
              end_time: business?.['終了時間'] || '',
            };
          });
          setShifts(formattedShifts);
        }

        // 残業時間を取得（当月）
        const date = parse(selectedDate, 'yyyy-MM-dd', new Date());
        const monthStart = format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM-dd');
        const monthEnd = format(new Date(date.getFullYear(), date.getMonth() + 1, 0), 'yyyy-MM-dd');
        
        const { data: overtimeData } = await supabase
          .from('shifts')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        if (overtimeData) {
          // 残業時間の計算ロジック（仮実装）
          const totalOvertime = overtimeData.length * 2; // 仮の計算
          setOvertime(totalOvertime);
        }

        // 手当回数を取得（当月）
        const { data: allowanceData } = await supabase
          .from('allowances')
          .select('allowance_type, count')
          .eq('employee_id', selectedEmployee)
          .gte('month', monthStart)
          .lte('month', monthEnd);

        if (allowanceData) {
          setAllowances(allowanceData);
        }
      } catch (error) {
        console.error('Error fetching shift data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShiftData();
  }, [selectedEmployee, selectedDate]);

  // 既存の残業時間登録データを取得
  useEffect(() => {
    if (!selectedEmployee || !selectedDate) return;

    const fetchExistingOvertime = async () => {
      try {
        const { data, error } = await supabase
          .from('manual_overtime')
          .select('*')
          .eq('employee_id', selectedEmployee)
          .eq('date', selectedDate)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching existing overtime:', error);
          return;
        }

        if (data) {
          setExistingOvertime(data);
          setManualOvertimeHours(data.overtime_hours);
          setManualOvertimeMemo(data.memo || '');
        } else {
          setExistingOvertime(null);
          setManualOvertimeHours(0);
          setManualOvertimeMemo('');
        }
      } catch (error) {
        console.error('Error in fetchExistingOvertime:', error);
      }
    };

    fetchExistingOvertime();
  }, [selectedEmployee, selectedDate]);

  // 残業時間登録の保存処理
  const handleSaveOvertime = async () => {
    if (!selectedEmployee || !selectedOffice || !selectedDate) {
      alert('営業所、従業員、日付を選択してください');
      return;
    }

    if (manualOvertimeHours === 0) {
      alert('残業時間を選択してください');
      return;
    }

    setSavingOvertime(true);
    try {
      const overtimeData = {
        employee_id: selectedEmployee,
        office: selectedOffice,
        date: selectedDate,
        overtime_hours: manualOvertimeHours,
        memo: manualOvertimeMemo || null,
      };

      if (existingOvertime) {
        // 更新
        const { error } = await supabase
          .from('manual_overtime')
          .update(overtimeData)
          .eq('id', existingOvertime.id);

        if (error) {
          console.error('Error updating overtime:', error);
          alert('残業時間の更新に失敗しました');
          return;
        }

        alert('残業時間を更新しました');
      } else {
        // 新規登録
        const { error } = await supabase
          .from('manual_overtime')
          .insert([overtimeData]);

        if (error) {
          console.error('Error inserting overtime:', error);
          alert('残業時間の登録に失敗しました');
          return;
        }

        alert('残業時間を登録しました');
      }

      // 再読み込み
      const { data, error: fetchError } = await supabase
        .from('manual_overtime')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .eq('date', selectedDate)
        .maybeSingle();

      if (!fetchError && data) {
        setExistingOvertime(data);
      }
    } catch (error) {
      console.error('Error in handleSaveOvertime:', error);
      alert('エラーが発生しました');
    } finally {
      setSavingOvertime(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center mb-2">
            <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">シフト確認</h1>
          </div>
          <p className="text-gray-600">スマートフォンで簡単にシフトを確認</p>
        </div>

        {/* 営業所選択 */}
        <Card>
          <CardHeader>
            <CardTitle>営業所選択</CardTitle>
            <CardDescription>確認したい営業所を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger>
                <SelectValue placeholder="営業所を選択" />
              </SelectTrigger>
              <SelectContent>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 従業員選択 */}
        <Card>
          <CardHeader>
            <CardTitle>従業員選択</CardTitle>
            <CardDescription>確認したい従業員を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedOffice}>
              <SelectTrigger>
                <SelectValue placeholder="従業員を選択" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.employee_id)}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 日付選択 */}
        <Card>
          <CardHeader>
            <CardTitle>日付選択</CardTitle>
            <CardDescription>確認したい日付を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* 勤務予定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              勤務予定
            </CardTitle>
            <CardDescription>
              {selectedDate && format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'yyyy年MM月dd日', { locale: ja })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500">読み込み中...</p>
            ) : shifts.length > 0 ? (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <div key={shift.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-lg text-blue-900">{shift.business_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {shift.start_time} - {shift.end_time}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">この日の勤務予定はありません</p>
            )}
          </CardContent>
        </Card>

        {/* 残業時間 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
              当月の残業時間
            </CardTitle>
            <CardDescription>
              {format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'yyyy年MM月', { locale: ja })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">{overtime}</div>
              <p className="text-sm text-gray-600 mt-1">時間</p>
            </div>
          </CardContent>
        </Card>

        {/* 手当支給回数 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-green-600" />
              手当支給回数
            </CardTitle>
            <CardDescription>
              {format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'yyyy年MM月', { locale: ja })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allowances.length > 0 ? (
              <div className="space-y-2">
                {allowances.map((allowance, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-900">{allowance.allowance_type}</span>
                    <span className="text-2xl font-bold text-green-600">{allowance.count}回</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">手当の支給はありません</p>
            )}
          </CardContent>
        </Card>

        {/* 残業時間登録 */}
        {selectedEmployee && selectedOffice && (
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2 text-purple-600" />
                残業時間登録
              </CardTitle>
              <CardDescription>
                {format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'yyyy年MM月dd日', { locale: ja })}の残業時間を登録
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 残業時間選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  残業時間（30分単位、最大6時間）
                </label>
                <Select 
                  value={String(manualOvertimeHours)} 
                  onValueChange={(value) => setManualOvertimeHours(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="残業時間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0.0時間</SelectItem>
                    <SelectItem value="0.5">0.5時間</SelectItem>
                    <SelectItem value="1">1.0時間</SelectItem>
                    <SelectItem value="1.5">1.5時間</SelectItem>
                    <SelectItem value="2">2.0時間</SelectItem>
                    <SelectItem value="2.5">2.5時間</SelectItem>
                    <SelectItem value="3">3.0時間</SelectItem>
                    <SelectItem value="3.5">3.5時間</SelectItem>
                    <SelectItem value="4">4.0時間</SelectItem>
                    <SelectItem value="4.5">4.5時間</SelectItem>
                    <SelectItem value="5">5.0時間</SelectItem>
                    <SelectItem value="5.5">5.5時間</SelectItem>
                    <SelectItem value="6">6.0時間</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 備考メモ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  備考メモ（任意）
                </label>
                <Textarea
                  value={manualOvertimeMemo}
                  onChange={(e) => setManualOvertimeMemo(e.target.value)}
                  placeholder="備考を入力してください"
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* 登録ボタン */}
              <Button
                onClick={handleSaveOvertime}
                disabled={savingOvertime || manualOvertimeHours === 0}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingOvertime ? '保存中...' : existingOvertime ? '更新' : '登録'}
              </Button>

              {/* 登録済みデータ表示 */}
              {existingOvertime && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-900">
                    登録済み: {existingOvertime.overtime_hours}時間
                  </p>
                  {existingOvertime.memo && (
                    <p className="text-sm text-gray-600 mt-1">
                      備考: {existingOvertime.memo}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
