import React, { useState, useEffect } from 'react';
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
  const [hasSearched, setHasSearched] = useState(false);

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
    setSelectedEmployee(""); // 営業所変更時に従業員選択をリセット
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
      console.log('📅 [DEBUG] Fetching shift data:', { employee_id: selectedEmployee, date: dateStr });
      
      // シフトデータを取得
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .eq('date', dateStr);
      
      console.log('📊 [DEBUG] Shift query result:', { data: shiftData, error: shiftError });
      
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
            start_time: business?.['開始時間'] || '',
            end_time: business?.['終了時間'] || '',
          };
        });
        setShifts(formattedShifts);
      } else {
        setShifts([]);
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

      // 手当回数を計算
      const { data: businessMasters } = await supabase
        .from('business_master')
        .select('業務id, 業務名, 早朝手当, 深夜手当');
      
      const businessMap = new Map((businessMasters || []).map(b => [b.業務id, b]));
      
      const { data: monthShifts } = await supabase
        .from('shifts')
        .select('business_master_id')
        .eq('employee_id', selectedEmployee)
        .gte('date', monthStart)
        .lte('date', monthEnd);
      
      const allowanceTypes: {[key: string]: number} = {};
      
      if (monthShifts) {
        monthShifts.forEach(shift => {
          const business = businessMap.get(shift.business_master_id);
          if (business) {
            if (business.早朝手当) {
              allowanceTypes['早朝手当'] = (allowanceTypes['早朝手当'] || 0) + 1;
            }
            if (business.深夜手当) {
              allowanceTypes['深夜手当'] = (allowanceTypes['深夜手当'] || 0) + 1;
            }
          }
        });
      }
      
      const allowanceList = Object.entries(allowanceTypes).map(([type, count]) => ({
        allowance_type: type,
        count: count
      }));
      
      setAllowances(allowanceList);
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Award className="h-5 w-5 mr-2" />
                    今月の手当回数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allowances.length > 0 ? (
                    <div className="space-y-2">
                      {allowances.map((allowance, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-gray-700">{allowance.allowance_type}</span>
                          <span className="text-xl font-bold text-blue-600">
                            {allowance.count}回
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500">手当なし</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
