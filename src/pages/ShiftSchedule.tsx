import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, RefreshCw, AlertTriangle, Home, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ShiftData {
  id: string;
  shift_date: string;
  employee_id: string;
  employee_name: string;
  business_master_id: string;
  business_group: string;
  created_at?: string;
}

interface EmployeeData {
  employee_id: string;
  name: string;
  office?: string;
}

export default function ShiftSchedule() {
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<ShiftData[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState<{[date: string]: EmployeeData[]}>({});

  useEffect(() => {
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadShifts();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    filterShifts();
  }, [shifts, selectedLocation]);

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading shifts from Supabase...');
      console.log('Date range:', startDate, 'to', endDate);
      
      // Load all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('app_9213e72257_employees')
        .select('employee_id, name, office');
      
      if (!employeesError && employeesData) {
        setAllEmployees(employeesData);
        console.log('👥 Loaded employees:', employeesData.length);
      }
      
      const { data, error } = await supabase
        .from('app_9213e72257_shifts')
        .select('*')
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date', { ascending: true });

      if (error) {
        console.error('❌ Error loading shifts:', error);
        toast.error('シフトデータの読み込みに失敗しました');
        setShifts([]);
        return;
      }

      console.log('✅ Loaded shifts:', data?.length || 0);
      setShifts(data || []);
      
      // Calculate unassigned employees for each date
      if (data && employeesData) {
        calculateUnassignedEmployees(data, employeesData);
      }
      
      if (data && data.length > 0) {
        toast.success(`${data.length}件のシフトを読み込みました`);
        
        // Extract unique locations
        const uniqueLocations = [...new Set(data.map((shift: any) => shift.location).filter(Boolean))];
        setLocations(uniqueLocations);
      } else {
        toast.info('指定期間にシフトデータがありません');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('データの読み込み中にエラーが発生しました');
      setShifts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterShifts = () => {
    let filtered = shifts;
    
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(shift => shift.location === selectedLocation);
    }
    
    setFilteredShifts(filtered);
  };

  const refreshData = () => {
    loadShifts();
  };
  
  const calculateUnassignedEmployees = (shiftsData: any[], employeesData: EmployeeData[]) => {
    console.log('🔍 [UNASSIGNED] Starting calculation...');
    console.log('🔍 [UNASSIGNED] Shifts data:', shiftsData.length);
    console.log('🔍 [UNASSIGNED] Employees data:', employeesData.length);
    
    // Group shifts by date
    const shiftsByDate: {[date: string]: Set<string>} = {};
    
    shiftsData.forEach(shift => {
      if (!shiftsByDate[shift.shift_date]) {
        shiftsByDate[shift.shift_date] = new Set();
      }
      shiftsByDate[shift.shift_date].add(shift.employee_id);
    });
    
    console.log('🔍 [UNASSIGNED] Shifts by date:', Object.keys(shiftsByDate));
    
    // Calculate unassigned employees for each date
    const unassigned: {[date: string]: EmployeeData[]} = {};
    
    Object.keys(shiftsByDate).forEach(date => {
      const assignedIds = shiftsByDate[date];
      unassigned[date] = employeesData.filter(emp => !assignedIds.has(emp.employee_id));
      console.log(`🔍 [UNASSIGNED] ${date}: ${assignedIds.size} assigned, ${unassigned[date].length} unassigned`);
    });
    
    setUnassignedEmployees(unassigned);
    console.log('📋 Calculated unassigned employees:', unassigned);
  };

  const groupShiftsByDate = () => {
    const grouped: { [date: string]: ShiftData[] } = {};
    
    filteredShifts.forEach(shift => {
      if (!grouped[shift.shift_date]) {
        grouped[shift.shift_date] = [];
      }
      grouped[shift.shift_date].push(shift);
    });
    
    return grouped;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日（${weekday}）`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">シフトデータを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  const groupedShifts = groupShiftsByDate();
  const dates = Object.keys(groupedShifts).sort();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Home Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">シフト管理</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            ホームへ戻る
          </Button>
        </Link>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            シフト表示
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">開始日</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">終了日</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">拠点フィルター</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="拠点を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全拠点</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={refreshData} disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Display */}
      {filteredShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-2">指定期間にシフトデータがありません</p>
              <p className="text-sm text-gray-500">
                シフト自動生成画面でシフトを生成してください
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold">表示中のシフト情報</div>
              <div className="text-sm mt-1">
                期間: {startDate} ～ {endDate} | 
                シフト数: {filteredShifts.length}件 | 
                日数: {dates.length}日間
              </div>
            </AlertDescription>
          </Alert>

          {dates.map(date => (
            <Card key={date}>
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(date)}
                  </span>
                  <Badge variant="outline">
                    {groupedShifts[date].length}件
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {/* Assigned Shifts */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-700">勤務者 ({groupedShifts[date].length}名)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groupedShifts[date].map((shift, index) => (
                        <div
                          key={shift.id || `${date}-${index}`}
                          className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="font-medium">{shift.employee_name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {shift.employee_id}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {shift.business_group}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Unassigned Employees */}
                  {unassignedEmployees[date] && unassignedEmployees[date].length > 0 ? (
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-3 text-gray-700">非勤務者 ({unassignedEmployees[date].length}名)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {unassignedEmployees[date].map((employee) => (
                          <div
                            key={employee.employee_id}
                            className="border border-gray-200 rounded-lg p-2 bg-gray-50 text-center"
                          >
                            <div className="text-sm font-medium text-gray-700">{employee.name}</div>
                            <div className="text-xs text-gray-500">{employee.employee_id}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-3 text-gray-500">非勤務者 (0名)</h3>
                      <p className="text-sm text-gray-400">全員が勤務しています</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

