import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, TrendingUp, Award, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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

export default function MobileShiftView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [offices, setOffices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [overtime, setOvertime] = useState<number>(0);
  const [allowances, setAllowances] = useState<AllowanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
          
          // 従業員情報から営業所IDを取得
          const { data: employeeData } = await supabase
            .from('employees')
            .select('office_id')
            .eq('id', userData.employee_id)
            .single();
          
          if (employeeData) {
            setSelectedOffice(employeeData.office_id);
          }
        }
      }
    };
    fetchCurrentUser();
  }, []);

  // 営業所リストを取得
  useEffect(() => {
    const fetchOffices = async () => {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setOffices(data);
      }
    };
    fetchOffices();
  }, []);

  // 従業員リストを取得（営業所でフィルタリング）
  useEffect(() => {
    if (!selectedOffice) return;
    
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('office_id', selectedOffice)
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
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // シフトデータを取得
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select(`
            *,
            business_master (
              business_name,
              start_time,
              end_time
            )
          `)
          .eq('employee_id', selectedEmployee)
          .eq('date', dateStr);

        if (!shiftError && shiftData) {
          const formattedShifts = shiftData.map(shift => ({
            ...shift,
            business_name: shift.business_master?.business_name || '',
            start_time: shift.business_master?.start_time || '',
            end_time: shift.business_master?.end_time || '',
          }));
          setShifts(formattedShifts);
        }

        // 残業時間を取得（当月）
        const monthStart = format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), 'yyyy-MM-dd');
        const monthEnd = format(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0), 'yyyy-MM-dd');
        
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
                  <SelectItem key={employee.id} value={employee.id}>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: ja }) : <span>日付を選択</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ja}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
              {selectedDate && format(selectedDate, 'yyyy年MM月dd日', { locale: ja })}
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
              {format(selectedDate, 'yyyy年MM月', { locale: ja })}
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
              {format(selectedDate, 'yyyy年MM月', { locale: ja })}
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
      </div>
    </div>
  );
}
