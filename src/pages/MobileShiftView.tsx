import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, TrendingUp, Award, Smartphone, Home, Search } from 'lucide-react';
import { format, parse } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>(''); // UUID (id)
  const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState<string>(''); // employee_id
  const [offices, setOffices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [nextDayShifts, setNextDayShifts] = useState<ShiftData[]>([]);
  const [overtime, setOvertime] = useState<number>(0);
  const [allowances, setAllowances] = useState<AllowanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const isInitialLoadRef = useRef(true);

  // ログインユーザー情報を取得
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('employee_id')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setCurrentUser(userData);
          setSelectedEmployee(userData.employee_id);
          
          const { data: employeeData } = await supabase
            .from('employees')
            .select('office, employee_id')
            .eq('id', userData.employee_id)
            .single();
          
          if (employeeData) {
            setSelectedOffice(employeeData.office);
            setSelectedEmployeeNumber(employeeData.employee_id);
          }
        }
      }
    };
    fetchCurrentUser();
  }, []);

  // 営業所リストを設定
  useEffect(() => {
    const officeList = [
      { id: '川越', name: '川越' },
      { id: '東京', name: '東京' },
      { id: '川口', name: '川口' }
    ];
    setOffices(officeList);
  }, []);

  // 従業員リストを取得
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
        // 初回ロード時以外のみ従業員選択をリセット
        if (!isInitialLoadRef.current) {
          setSelectedEmployee("");
        } else {
          isInitialLoadRef.current = false;
        }
      }
    };
    fetchEmployees();
  }, [selectedOffice]);

  // 実行ボタンがクリックされたときにシフトデータを取得
  const handleExecute = async () => {
    if (!selectedEmployee || !selectedDate) {
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      const dateStr = selectedDate;
      // 従業員番号を取得
      const { data: employeeData } = await supabase
        .from('employees')
        .select('employee_id')
        .eq('id', selectedEmployee)
        .single();
      
      const employeeNumber = employeeData?.employee_id || selectedEmployeeNumber;
      
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeNumber)
        .eq('date', dateStr);
      
      if (!shiftError && shiftData && shiftData.length > 0) {
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
            business_name: business?.['業務名'] || '業務名不明',
            start_time: business?.['開始時間'] || '',
            end_time: business?.['終了時間'] || '',
          };
        });
        setShifts(formattedShifts);
      } else {
        setShifts([]);
      }

      // 翌日のシフトデータを取得
      const nextDate = format(new Date(parse(dateStr, 'yyyy-MM-dd', new Date()).getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const { data: nextDayShiftData, error: nextDayShiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employeeNumber)
        .eq('date', nextDate);
      
      if (!nextDayShiftError && nextDayShiftData && nextDayShiftData.length > 0) {
        const nextBusinessIds = nextDayShiftData.map(s => s.business_master_id).filter(Boolean);
        const { data: nextBusinessData } = await supabase
          .from('business_master')
          .select('*')
          .in('業務id', nextBusinessIds);
        
        const nextBusinessMap = new Map();
        if (nextBusinessData) {
          nextBusinessData.forEach(b => {
            nextBusinessMap.set(b['業務id'], b);
          });
        }
        
        const formattedNextDayShifts = nextDayShiftData.map(shift => {
          const business = nextBusinessMap.get(shift.business_master_id);
          return {
            ...shift,
            business_name: business?.['業務名'] || '業務名不明',
            start_time: business?.['開始時間'] || '',
            end_time: business?.['終了時間'] || '',
          };
        });
        setNextDayShifts(formattedNextDayShifts);
      } else {
        setNextDayShifts([]);
      }

      // 残業時間を取得
      const date = parse(selectedDate, 'yyyy-MM-dd', new Date());
      const monthStart = format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM-dd');
      const monthEnd = format(new Date(date.getFullYear(), date.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      const { data: overtimeData } = await supabase
        .from('manual_overtime')
        .select('overtime_hours')
        .eq('employee_id', selectedEmployee)
        .gte('date', monthStart)
        .lte('date', monthEnd);

      if (overtimeData) {
        const totalOvertime = overtimeData.reduce((sum: number, record: any) => {
          return sum + (parseFloat(record.overtime_hours) || 0);
        }, 0);
        setOvertime(totalOvertime);
      } else {
        setOvertime(0);
      }
    } catch (error) {
      console.error('Error fetching shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                ホーム
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Smartphone className="h-6 w-6 mr-2" />
                シフト確認
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
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

            <CardTitle>従業員選択</CardTitle>
            <CardDescription>確認したい従業員を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="従業員を選択" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

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

        <Button 
          onClick={handleExecute} 
          disabled={loading || !selectedEmployee || !selectedDate}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>読み込み中...</>
          ) : (
            <>
              <Search className="h-5 w-5 mr-2" />
              実行
            </>
          )}
        </Button>

        {hasSearched && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  勤務予定
                </CardTitle>
                <CardDescription>
                  {format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'yyyy年MM月dd日', { locale: ja })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shifts.length > 0 ? (
                  <div className="space-y-3">
                    {shifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="font-semibold text-lg text-blue-900 mb-2">
                          {shift.business_name}
                        </div>
                        <div className="text-sm text-blue-700">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    この日のシフトはありません
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  翌日の勤務予定
                </CardTitle>
                <CardDescription>
                  {format(new Date(parse(selectedDate, 'yyyy-MM-dd', new Date()).getTime() + 24 * 60 * 60 * 1000), 'yyyy年MM月dd日', { locale: ja })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nextDayShifts.length > 0 ? (
                  <div className="space-y-3">
                    {nextDayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-4 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="font-semibold text-lg text-green-900 mb-2">
                          {shift.business_name}
                        </div>
                        <div className="text-sm text-green-700">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    この日のシフトはありません
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  今月の残業時間
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {overtime.toFixed(1)}時間
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
