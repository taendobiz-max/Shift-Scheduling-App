import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Edit, Trash2, Plus, Filter, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { employeeService, shiftService, Employee, Shift } from '@/lib/supabase';

export default function ShiftSchedule() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dataSource, setDataSource] = useState<'supabase' | 'mock'>('supabase');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterShifts();
  }, [shifts, selectedDate, selectedEmployee, searchTerm]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load employees from Supabase first
      console.log('🔄 Loading employees from Supabase...');
      const supabaseEmployees = await employeeService.getAll();
      
      if (supabaseEmployees && supabaseEmployees.length > 0) {
        console.log('✅ Loaded employees from Supabase:', supabaseEmployees.length);
        setEmployees(supabaseEmployees);
        setDataSource('supabase');
        
        // Load shifts from Supabase
        const supabaseShifts = await shiftService.getAll();
        setShifts(supabaseShifts);
        
        toast.success(`Supabaseから従業員${supabaseEmployees.length}名、シフト${supabaseShifts.length}件を読み込みました`);
      } else {
        console.log('⚠️ No employees found in Supabase, using mock data');
        // Fallback to mock data
        const mockEmployees: Employee[] = [
          { id: '1', name: '田中太郎', employee_id: 'EMP001', status: 'active' },
          { id: '2', name: '佐藤花子', employee_id: 'EMP002', status: 'active' },
          { id: '3', name: '鈴木一郎', employee_id: 'EMP003', status: 'active' },
          { id: '4', name: '高橋美咲', employee_id: 'EMP004', status: 'active' },
          { id: '5', name: '山田健太', employee_id: 'EMP005', status: 'active' }
        ];
        
        setEmployees(mockEmployees);
        setDataSource('mock');
        
        // Load shifts from localStorage for mock data
        const savedShifts = localStorage.getItem('generatedShifts');
        if (savedShifts) {
          try {
            const parsedShifts = JSON.parse(savedShifts);
            setShifts(parsedShifts);
            toast.success('LocalStorageからシフトデータを読み込みました');
          } catch (error) {
            console.error('LocalStorageからのシフト読み込みエラー:', error);
            generateSampleShifts(mockEmployees);
          }
        } else {
          generateSampleShifts(mockEmployees);
        }
        
        toast.info('Supabaseに従業員データがないため、サンプルデータを使用しています');
      }
    } catch (error) {
      console.error('❌ Data loading error:', error);
      setError(error instanceof Error ? error.message : 'データの読み込みに失敗しました');
      toast.error('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleShifts = (employees: Employee[]) => {
    const sampleShifts: Shift[] = [];
    const today = new Date();
    
    // Generate shifts for the next 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 2-3 shifts per day
      const dailyShiftCount = Math.floor(Math.random() * 2) + 2;
      const selectedEmployees = employees
        .sort(() => Math.random() - 0.5)
        .slice(0, dailyShiftCount);

      const shiftPatterns = [
        { start: '06:00', end: '14:00' },
        { start: '14:00', end: '22:00' },
        { start: '08:00', end: '17:00' }
      ];

      selectedEmployees.forEach((employee, index) => {
        const pattern = shiftPatterns[index % shiftPatterns.length];
        sampleShifts.push({
          id: `${dateStr}-${employee.employee_id}`,
          employee_id: employee.employee_id,
          employee_name: employee.name,
          shift_date: dateStr,
          start_time: pattern.start,
          end_time: pattern.end,
          status: 'scheduled'
        });
      });
    }
    
    setShifts(sampleShifts);
    toast.info('サンプルシフトデータを生成しました');
  };

  const filterShifts = () => {
    let filtered = [...shifts];

    if (selectedDate) {
      filtered = filtered.filter(shift => shift.shift_date === selectedDate);
    }

    if (selectedEmployee && selectedEmployee !== 'all') {
      filtered = filtered.filter(shift => shift.employee_id === selectedEmployee);
    }

    if (searchTerm) {
      filtered = filtered.filter(shift => 
        shift.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredShifts(filtered);
  };

  const clearFilters = () => {
    setSelectedDate('');
    setSelectedEmployee('all');
    setSearchTerm('');
  };

  const refreshData = async () => {
    await loadData();
  };

  const getShiftsByDate = () => {
    const shiftsByDate: { [key: string]: Shift[] } = {};
    filteredShifts.forEach(shift => {
      if (!shiftsByDate[shift.shift_date]) {
        shiftsByDate[shift.shift_date] = [];
      }
      shiftsByDate[shift.shift_date].push(shift);
    });
    return shiftsByDate;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'confirmed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '予定';
      case 'confirmed': return '確定';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">データを読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">データ読み込みエラー</h2>
            <p className="text-gray-600 mb-4 max-w-md">{error}</p>
            <Button onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">シフト管理</h1>
          <p className="text-gray-600 mt-2">シフトの確認・編集・調整を行います</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            データ更新
          </Button>
          <Link to="/shift-generator">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              新規シフト生成
            </Button>
          </Link>
        </div>
      </div>

      {/* データソース表示 */}
      <Card className={dataSource === 'supabase' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant={dataSource === 'supabase' ? 'default' : 'secondary'}>
                {dataSource === 'supabase' ? 'Supabase連携' : 'サンプルデータ'}
              </Badge>
              <span className="text-sm text-gray-600">
                {dataSource === 'supabase' 
                  ? 'リアルタイムで従業員マスタと連携しています' 
                  : 'Supabaseに従業員データがないため、サンプルデータを使用中'
                }
              </span>
            </div>
            <Link to="/employees">
              <Button variant="outline" size="sm">
                従業員管理へ
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              総シフト数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              対象従業員
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}人</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              今日のシフト
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts.filter(s => s.shift_date === new Date().toISOString().split('T')[0]).length}件
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              表示中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredShifts.length}件</div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 フィルター・検索</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>日付</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>従業員</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="従業員を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全員</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.employee_id}>
                      {employee.name} ({employee.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>検索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="従業員名・IDで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                フィルタークリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* シフト表示 */}
      <Card>
        <CardHeader>
          <CardTitle>📅 シフト一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredShifts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">表示するシフトがありません</p>
              <p className="text-sm text-gray-400 mt-2">
                フィルターを調整するか、新しいシフトを生成してください
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(getShiftsByDate())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dayShifts]) => (
                  <div key={date} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      {formatDate(date)}
                    </h3>
                    <div className="grid gap-3">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="font-medium text-gray-900">
                                {shift.employee_name}
                              </div>
                              <Badge variant="outline">
                                {shift.employee_id}
                              </Badge>
                              <div className="text-sm text-gray-500">
                                {shift.start_time} - {shift.end_time}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusBadgeVariant(shift.status)}>
                              {getStatusText(shift.status)}
                            </Badge>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}