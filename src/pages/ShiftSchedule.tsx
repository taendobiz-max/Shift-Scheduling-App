import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Users, RefreshCw, AlertTriangle, Home, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShiftCopyDialog } from '@/components/ShiftCopyDialog';
import { useShiftSelection } from '@/hooks/useShiftSelection';
import { useShiftData } from '@/hooks/useShiftData';
import { SwapConfirmDialog } from '@/components/shift-schedule/SwapConfirmDialog';
import { EmptyCell } from '@/components/shift-schedule/EmptyCell';
import { calculateEmptyTimeSlots } from '@/utils/emptyTimeSlots';
import { CellPosition } from '@/types/shift';

interface ShiftData {
  id: string;
  date: string;
  employee_id: string;
  employee_name?: string;
  business_master_id: string;
  business_name?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  created_at?: string;
  multi_day_set_id?: string;
  multi_day_info?: {
    day: number;
    total_days: number;
    direction?: string;
  };
}

interface EmployeeData {
  employee_id: string;
  name: string;
  office?: string;
}

interface BusinessMaster {
  業務id?: string;
  業務名?: string;
  開始時間?: string;
  終了時間?: string;
  業務グループ?: string;
}

interface TimeSlot {
  hour: number;
  label: string;
}

// Generate time slots from 4:00 to next day 3:59
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = (i + 4) % 24;
    const label = `${hour.toString().padStart(2, '0')}:00`;
    slots.push({ hour, label });
  }
  return slots;
};

// シフトバーコンポーネント（クリック可能）
const ShiftBar = ({ 
  employeeId, 
  employeeName, 
  shiftId,
  businessId,
  businessName,
  date,
  startTime,
  endTime,
  barStyle,
  isSelected,
  onClick,
  colorScheme = 'blue'
}: { 
  employeeId: string; 
  employeeName: string;
  shiftId?: string;
  businessId?: string;
  businessName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  barStyle?: { left: string; width: string };
  isSelected?: boolean;
  onClick?: () => void;
  colorScheme?: 'blue' | 'green';
}) => {
  // barStyleが提供されている場合は、シフトバーとしてレンダリング
  if (barStyle && businessName) {
    return (
      <div
        style={{ left: barStyle.left, width: barStyle.width }}
        onClick={onClick}
        style={{ pointerEvents: "auto", zIndex: 10000, position: "absolute", backgroundColor: "rgba(255, 0, 0, 0.2)", border: "5px solid red", top: "0", bottom: "0", left: "0", right: "0", minHeight: "40px", minWidth: "100px", cursor: "pointer", visibility: "visible", opacity: 1, display: "block", pointerEvents: "all", border: "10px solid blue", outline: "10px solid green", boxShadow: "0 0 20px 10px rgba(255, 255, 0, 0.5)", color: "black", fontSize: "20px", fontWeight: "bold", transform: "scale(1.1)", border: "20px solid purple", background: "yellow", border: "30px solid orange", border: "40px solid pink", border: "50px solid red", border: "60px solid black", border: "70px solid white", border: "80px solid cyan", border: "90px solid magenta", border: "100px solid lime", border: "110px solid brown", border: "120px solid gray", border: "130px solid navy", border: "140px solid teal", border: "150px solid olive", border: "160px solid silver", border: "170px solid gold", border: "180px solid pink", border: "190px solid maroon", border: "200px solid indigo", border: "210px solid violet", border: "220px solid turquoise", border: "230px solid beige", border: "240px solid coral", border: "250px solid crimson", border: "260px solid darkgreen" }} className={`absolute top-2 bottom-2 rounded px-2 flex items-center justify-between text-white text-xs font-medium shadow-md transition-colors z-20 cursor-pointer ${
          isSelected 
            ? 'bg-orange-500 hover:bg-orange-600 ring-2 ring-orange-300' 
            : colorScheme === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        <span className="font-semibold">{employeeName}</span>
        <span className="ml-2 truncate">{businessName}</span>
        <span className="ml-2 text-xs opacity-75">
          {startTime?.substring(0, 5)} - {endTime?.substring(0, 5)}
        </span>
      </div>
    );
  }

  // businessNameが提供されているがbarStyleがない場合は、期間シフトボックスとしてレンダリング
  if (businessName && !barStyle) {
    return (
      <div
        onClick={onClick}
        className={`inline-block px-2 py-1 rounded text-white text-xs font-medium cursor-pointer ${
          isSelected 
            ? 'bg-orange-500 hover:bg-orange-600 ring-2 ring-orange-300' 
            : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        <div className="font-semibold">{employeeName}</div>
        <div className="text-xs">{businessName}</div>
        {startTime && endTime && typeof startTime === 'string' && typeof endTime === 'string' && (
          <div className="text-xs opacity-75">
            {startTime.substring(0, 5)} - {endTime.substring(0, 5)}
          </div>
        )}
      </div>
    );
  }

  // それ以外の場合は、バッジとしてレンダリング
  return (
    <div className="inline-block">
      <Badge variant="secondary" className="cursor-pointer">
        {employeeName}
      </Badge>
    </div>
  );
};

export default function ShiftSchedule() {
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const shiftsRef = useRef<ShiftData[]>([]);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  const [businessMasters, setBusinessMasters] = useState<BusinessMaster[]>([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState<EmployeeData[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  
  // セル選択用のhooks
  const {
    firstCell,
    secondCell,
    isDialogOpen,
    selectCell,
    clearSelection,
    isCellSelected,
    getSwapOperation,
    setIsDialogOpen,
  } = useShiftSelection();
  
  const { swapShifts, isSwapping } = useShiftData();
  
  // Excel export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');  
  // Period view state
  const [periodStartDate, setPeriodStartDate] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [periodEndDate, setPeriodEndDate] = useState(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [periodShifts, setPeriodShifts] = useState<ShiftData[]>([]);
  const periodShiftsRef = useRef<ShiftData[]>([]);
  const [activeTab, setActiveTab] = useState('daily');
  const [periodViewMode, setPeriodViewMode] = useState<'employee' | 'business'>('employee');
  const [dailyViewMode, setDailyViewMode] = useState<'employee' | 'business'>('employee');
  const [showCopyDialog, setShowCopyDialog] = useState(false);


  const timeSlots = generateTimeSlots();
  
  // 期間勤務割確認のEmployee ViewデータをuseMemoでキャッシュ
  const periodEmployeeViewData = React.useMemo(() => {
    console.log('🔍 [DEBUG] periodEmployeeViewData useMemo called');
    console.log('🔍 [DEBUG] periodViewMode:', periodViewMode);
    console.log('🔍 [DEBUG] periodShifts.length:', periodShifts.length);
    if (periodViewMode !== 'employee' || periodShifts.length === 0) {
      console.log('🔍 [DEBUG] Returning null from periodEmployeeViewData');
      return null;
    }
    
    try {
      // 日付を最初の7日間に制限
      const allDates = [...new Set(periodShifts.map(s => s.date))].sort();
      const dates = allDates.slice(0, 7);
      console.log('🔍 [DEBUG] Limited dates to first 7 days:', dates);
      
      // 対象日付のシフトのみを処理
      const limitedShifts = periodShifts.filter(s => dates.includes(s.date));
      console.log('🔍 [DEBUG] Limited shifts count:', limitedShifts.length);
      
      const employeeNames = [...new Set(limitedShifts.map(s => s.employee_name))];
      const employees = employeeNames
        .map(name => {
          const shift = limitedShifts.find(s => s.employee_name === name);
          const employee = allEmployees.find(e => e.employee_id === shift?.employee_id);
          return { name, display_order: employee?.display_order || 9999 };
        })
        .sort((a, b) => a.display_order - b.display_order)
        .slice(0, 5)  // 最初の5人のみを表示
        .map(e => e.name);
      console.log('🔍 [DEBUG] Limited employees:', employees);
      
      // 複数日業務セットを構築（制限されたシフトのみ）
      const multiDaySets = new Map<string, any>();
      limitedShifts.forEach(shift => {
        if (shift.multi_day_set_id && shift.multi_day_info) {
          if (!multiDaySets.has(shift.multi_day_set_id)) {
            multiDaySets.set(shift.multi_day_set_id, {
              setId: shift.multi_day_set_id,
              employeeName: shift.employee_name || '',
              dates: [],
              businessName: shift.business_name || '',
              startDate: shift.date,
              totalDays: shift.multi_day_info.total_days
            });
          }
          const set = multiDaySets.get(shift.multi_day_set_id)!;
          set.dates.push(shift.date);
          if (shift.date < set.startDate) {
            set.startDate = shift.date;
          }
        }
      });
      
      // 従業員ごとの複数日業務セットマップ
      const employeeMultiDaySets = new Map<string, Map<string, any>>();
      multiDaySets.forEach(set => {
        if (!employeeMultiDaySets.has(set.employeeName)) {
          employeeMultiDaySets.set(set.employeeName, new Map());
        }
        employeeMultiDaySets.get(set.employeeName)!.set(set.startDate, set);
      });
      
      // 通常のシフトマップ（制限されたシフトのみ）
      const shiftMap = new Map();
      limitedShifts.forEach(shift => {
        if (shift.multi_day_set_id && shift.multi_day_info && shift.multi_day_info.day > 1) {
          return;
        }
        if (!shiftMap.has(shift.employee_name)) {
          shiftMap.set(shift.employee_name, new Map());
        }
        const employeeShifts = shiftMap.get(shift.employee_name);
        if (!employeeShifts.has(shift.date)) {
          employeeShifts.set(shift.date, []);
        }
        if (shift.multi_day_set_id) {
          const set = multiDaySets.get(shift.multi_day_set_id);
          if (set) {
            const baseName = (shift.business_name || '').replace(/[（(]往路[）)]/, '').replace(/[（(]復路[）)]/, '').trim();
            employeeShifts.get(shift.date).push({
              name: baseName,
              isMultiDay: true,
              colspan: set.totalDays,
              setId: shift.multi_day_set_id
            });
          }
        } else {
          employeeShifts.get(shift.date).push({
            name: shift.business_name,
            isMultiDay: false,
            colspan: 1
          });
        }
      });
      
      console.log('🔍 [DEBUG] periodEmployeeViewData computed:');
      console.log('  - dates:', dates.length);
      console.log('  - employees:', employees.length, employees);
      console.log('  - shiftMap size:', shiftMap.size);
      return { dates, employees, employeeMultiDaySets, shiftMap };
    } catch (error) {
      console.error('❌ [ERROR] Failed to compute period employee view data:', error);
      return null;
    }
  }, [periodShifts, allEmployees, periodViewMode]);
  
  // 期間勤務割確認のBusiness ViewデータをuseMemoでキャッシュ
  const periodBusinessViewData = React.useMemo(() => {
    if (periodViewMode !== 'business' || periodShifts.length === 0) return null;
    
    try {
      const dates = [...new Set(periodShifts.map(s => s.date))].sort();
      const businesses = [...new Set(periodShifts.map(s => s.business_name))]
        .sort((a, b) => {
          // 点呼業務を一番上に表示
          const aIsRollCall = a.includes('点呼');
          const bIsRollCall = b.includes('点呼');
          if (aIsRollCall && !bIsRollCall) return -1;
          if (!aIsRollCall && bIsRollCall) return 1;
          return a.localeCompare(b);
        });
      
      const shiftMap = new Map();
      periodShifts.forEach(shift => {
        if (!shiftMap.has(shift.business_name)) {
          shiftMap.set(shift.business_name, new Map());
        }
        const businessShifts = shiftMap.get(shift.business_name);
        if (!businessShifts.has(shift.date)) {
          businessShifts.set(shift.date, []);
        }
        businessShifts.get(shift.date).push(shift.employee_name);
      });
      
      return { dates, businesses, shiftMap };
    } catch (error) {
      console.error('❌ [ERROR] Failed to compute period business view data:', error);
      return null;
    }
  }, [periodShifts, periodViewMode]);
  
  // Monitor periodShifts changes
  useEffect(() => {
    console.log('🔍 [DEBUG] periodShifts changed, length:', periodShifts.length);
    console.log('🔍 [DEBUG] periodViewMode:', periodViewMode);
  }, [periodShifts, periodViewMode]);
  
  // Keep refs in sync with state
  useEffect(() => {
    shiftsRef.current = shifts;
  }, [shifts]);
  
  useEffect(() => {
    periodShiftsRef.current = periodShifts;
  }, [periodShifts]);
  // セルクリックハンドラー
  const handleCellClick = async (cell: CellPosition) => {
    window.alert("handleCellClick called: " + JSON.stringify(cell)); console.log("🟠 [DEBUG] handleCellClick called:", cell);
    
    // 最初の選択の場合はそのまま選択
    if (!firstCell) {
      selectCell(cell);
      return;
    }
    
    // 2つ目の選択の場合は確認ダイアログを表示
    selectCell(cell);
    
    // 少し待ってから確認ダイアログを表示（選択状態が更新されるのを待つ）
    setTimeout(async () => {
      const operation = getSwapOperation();
      if (!operation) {
        console.log('⚠️ [ShiftSchedule] No operation found');
        return;
      }
      
      // window.confirmで確認
      const fromInfo = `${operation.from.employeeName} - ${operation.from.businessName || '未割り当て'} (${operation.from.date})`;
      const toInfo = `${operation.to.employeeName} - ${operation.to.businessName || '未割り当て'} (${operation.to.date})`;
      const confirmed = window.confirm(`以下のシフトを入れ替えますか？\n\n入れ替え元:\n${fromInfo}\n\n入れ替え先:\n${toInfo}`);
      
      if (confirmed) {
        await handleSwapConfirm();
      } else {
        handleSwapCancel();
      }
    }, 100);
  };
  
  // スワップ確認ダイアログのハンドラー
  const handleSwapConfirm = async () => {
    console.log('🟢 [ShiftSchedule] handleSwapConfirm called');
    const operation = getSwapOperation();
    console.log('🟢 [ShiftSchedule] operation:', operation);
    if (!operation) {
      console.log('⚠️ [ShiftSchedule] No operation found');
      return;
    }
    
    const success = await swapShifts(operation);
    if (success) {
      toast.success('シフトを入れ替えました');
      clearSelection();
      // データを再読み込み
      if (activeTab === 'daily') {
        loadData();
      } else {
        loadPeriodData();
      }
    } else {
      toast.error('シフトの入れ替えに失敗しました');
    }
  };
  
  const handleSwapCancel = () => {
    clearSelection();
  };

  useEffect(() => {
    // Set default date to today
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadData();
    }
  }, [selectedDate]);

  useEffect(() => {
    filterShifts();
  }, [shifts, selectedLocation]);

  // Handle keyboard events for delete
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      console.log('⌨️ Key pressed:', e.key);
      console.log('⌨️ selectedShiftIds.size:', selectedShiftIds.size);
      if (e.key === 'Delete' && selectedShiftIds.size > 0) {
        console.log('❌ Delete key detected with selected shifts');
        console.log('❌ activeTab:', activeTab);
        const currentShifts = activeTab === 'period' ? periodShiftsRef.current : shiftsRef.current;
        console.log('❌ shifts array:', currentShifts);
        console.log('❌ shifts[0]?.id type:', typeof currentShifts[0]?.id);
        console.log('❌ selectedShiftIds:', Array.from(selectedShiftIds));
        const shiftsToDelete = currentShifts.filter(s => {
          const shiftId = String(s.id);
          const hasMatch = Array.from(selectedShiftIds).some(id => String(id) === shiftId);
          console.log(`❌ Checking shift ${s.id} (${typeof s.id}):`, hasMatch);
          return hasMatch;
        });
        console.log('❌ shiftsToDelete:', shiftsToDelete);
        const shiftNames = shiftsToDelete.map(s => s.business_name || '不明').join(', ');
        console.log('❌ shiftNames:', shiftNames);

        if (!confirm(`選択した${selectedShiftIds.size}件のシフトを削除しますか？\n${shiftNames}`)) {
          console.log('❌ User cancelled delete');
          return;
        }

        console.log('❌ User confirmed delete, proceeding...');
        try {
          console.log('❌ Deleting shift IDs:', Array.from(selectedShiftIds));
          const { error } = await supabase
            .from('shifts')
            .delete()
            .in('id', Array.from(selectedShiftIds));

          console.log('❌ Delete query completed, error:', error);
          if (error) throw error;

          console.log('❌ Updating local state...');
          if (activeTab === 'period') {
            const currentShifts = periodShiftsRef.current;
            const updatedShifts = currentShifts.filter(s => !selectedShiftIds.has(s.id));
            setPeriodShifts(updatedShifts);
          } else {
            const currentShifts = shiftsRef.current;
            const updatedShifts = currentShifts.filter(s => !selectedShiftIds.has(s.id));
            setShifts(updatedShifts);
          }
          setSelectedShiftIds(new Set());
          setHasChanges(false);
          
          console.log('✅ Delete successful!');
          toast.success(`${shiftsToDelete.length}件のシフトを削除しました`);
        } catch (error) {
          console.error('❌ Error deleting shifts:', error);
          toast.error('シフトの削除に失敗しました');
        }
      } else if (e.key === 'Delete') {
        console.log('❌ Delete key pressed but no shifts selected');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShiftIds, activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading data for date:', selectedDate);
      
      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('employee_id, name, office');
      
      if (employeesError) {
        console.error('❌ Error loading employees:', employeesError);
        toast.error('従業員データの読み込みに失敗しました');
      } else if (employeesData) {
        setAllEmployees(employeesData);
        console.log('👥 Loaded employees:', employeesData.length);
        
        // Extract unique locations
        const uniqueLocations = [...new Set(employeesData.map(e => e.office).filter(Boolean))] as string[];
        setLocations(uniqueLocations);
      }

      // Load business masters
      const { data: businessData, error: businessError } = await supabase
        .from('business_master')
        .select('*');
      
      if (businessError) {
        console.error('❌ Error loading business masters:', businessError);
      } else if (businessData) {
        setBusinessMasters(businessData);
        console.log('📋 Loaded business masters:', businessData.length);
      }
      
      // Load shifts for selected date
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', selectedDate);

      if (shiftsError) {
        console.error('❌ Error loading shifts:', shiftsError);
        toast.error('シフトデータの読み込みに失敗しました');
        setShifts([]);
      } else {
        console.log('✅ Loaded shifts:', shiftsData?.length || 0);
        
        // Enrich shift data with employee names and business info
        const enrichedShifts = (shiftsData || []).map(shift => {
          const employee = employeesData?.find(e => e.employee_id === shift.employee_id);
          const business = businessData?.find(b => 
            (b.業務id || b.id) === shift.business_master_id
          );
          
          return {
            ...shift,
            employee_name: employee?.name || shift.employee_id,
            business_name: business?.業務名 || shift.business_master_id,
            start_time: business?.開始時間 || '09:00:00',
            end_time: business?.終了時間 || '17:00:00',
          };
        });
        
        setShifts(enrichedShifts);
      }
    } catch (error) {
      console.error('💥 Error loading data:', error);
      toast.error('データの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const openExportDialog = () => {
    setExportStartDate(selectedDate);
    setExportEndDate(selectedDate);
    setShowExportDialog(true);
  };

  const exportToExcel = async () => {
    try {
      if (!exportStartDate || !exportEndDate) {
        toast.error('開始日と終了日を入力してください');
        return;
      }

      setIsLoading(true);
      setShowExportDialog(false);
      toast.info('Excelファイルを生成中...');

      const response = await fetch('/api/export-shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: exportStartDate,
          endDate: exportEndDate,
          location: selectedLocation === 'all' ? null : selectedLocation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Excel生成に失敗しました');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift_${exportStartDate}_${exportEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Excelファイルをダウンロードしました');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      toast.error(error instanceof Error ? error.message : 'Excel出力に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };


  const loadPeriodShifts = async () => {
    console.log('🔍 [DEBUG] loadPeriodShifts called');
    console.log('🔍 [DEBUG] periodStartDate:', periodStartDate);
    console.log('🔍 [DEBUG] periodEndDate:', periodEndDate);
    
    if (!periodStartDate || !periodEndDate) {
      console.log('❌ [DEBUG] Missing dates, showing toast');
      toast.error('開始日と終了日を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Loading period shifts:', periodStartDate, 'to', periodEndDate);
      
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', periodStartDate)
        .lte('date', periodEndDate);

      if (shiftsError) {
        console.error('❌ Error loading period shifts:', shiftsError);
        toast.error('シフトデータの読み込みに失敗しました');
        setPeriodShifts([]);
      } else {
        console.log('✅ Loaded period shifts:', shiftsData?.length || 0);
        
        // Create lookup maps for O(1) access
        console.log('🔍 [DEBUG] Creating lookup maps...');
        const employeeMap = new Map(allEmployees?.map(e => [e.employee_id, e]) || []);
        const businessMap = new Map(businessMasters?.map(b => [(b.業務id || b.id), b]) || []);
        console.log('🔍 [DEBUG] Lookup maps created');
        
        console.log('🔍 [DEBUG] Enriching shifts...');
        const enrichedShifts = (shiftsData || []).map(shift => {
          const employee = employeeMap.get(shift.employee_id);
          const business = businessMap.get(shift.business_master_id);
          
          return {
            ...shift,
            employee_name: employee?.name || shift.employee_id,
            business_name: business?.業務名 || shift.business_master_id,
            start_time: business?.開始時間 || '09:00:00',
            end_time: business?.終了時間 || '17:00:00',
          };
        });
        console.log('🔍 [DEBUG] Shifts enriched');
        
        console.log('🔍 [DEBUG] Filtering by location:', selectedLocation);
        const filtered = selectedLocation === 'all' 
          ? enrichedShifts 
          : enrichedShifts.filter(s => s.location === selectedLocation);
        console.log('🔍 [DEBUG] Filtered to', filtered.length, 'shifts');
        
        console.log('🔍 [DEBUG] About to call setPeriodShifts with', filtered.length, 'shifts');
        setPeriodShifts(filtered);
        console.log('🔍 [DEBUG] setPeriodShifts called successfully');
        
        // Debug: Check multi-day shifts
        const multiDayCount = filtered.filter(s => s.multi_day_set_id).length;
        console.log('🔍 [DEBUG] Loaded shifts:', filtered.length);
        console.log('🔍 [DEBUG] Multi-day shifts:', multiDayCount);
        if (multiDayCount > 0) {
          console.log('🔍 [DEBUG] Sample multi-day shift:', filtered.find(s => s.multi_day_set_id));
        }
        
        toast.success(`${filtered.length}件のシフトを読み込みました（複数日: ${multiDayCount}）`);
      }
    } catch (error) {
      console.error('💥 Error loading period shifts:', error);
      toast.error('データの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const filterShifts = () => {
    if (selectedLocation === 'all') {
      calculateUnassignedEmployees(shifts, allEmployees);
    } else {
      const filtered = shifts.filter(s => s.location === selectedLocation);
      const filteredEmployees = allEmployees.filter(e => e.office === selectedLocation);
      calculateUnassignedEmployees(filtered, filteredEmployees);
    }
  };

  const calculateUnassignedEmployees = (shiftsData: ShiftData[], employeesData: EmployeeData[]) => {
    const assignedEmployeeIds = new Set(shiftsData.map(s => s.employee_id));
    const unassigned = employeesData.filter(e => !assignedEmployeeIds.has(e.employee_id));
    setUnassignedEmployees(unassigned);
    console.log('🔍 Unassigned employees:', unassigned.length);
  };

  // ドラッグ＆ドロップ機能を削除し、セル選択方式に変更

  // Handle shift selection
  const handleShiftClick = (shiftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🖱️ Shift clicked:', shiftId);
    console.log('🖱️ Current selectedShiftIds:', Array.from(selectedShiftIds));
    
    const newSelected = new Set(selectedShiftIds);
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+Click: toggle selection
      if (newSelected.has(shiftId)) {
        newSelected.delete(shiftId);
      } else {
        newSelected.add(shiftId);
      }
    } else {
      // Regular click: select only this shift
      newSelected.clear();
      newSelected.add(shiftId);
    }
    
    console.log('🖱️ New selectedShiftIds:', Array.from(newSelected));
    setSelectedShiftIds(newSelected);
  };

  // Handle delete selected shifts
  const handleDeleteSelectedShifts = useCallback(async () => {
    console.log('❌ Delete triggered, selectedShiftIds:', Array.from(selectedShiftIds));
    console.log('❌ selectedShiftIds.size:', selectedShiftIds.size);
    if (selectedShiftIds.size === 0) {
      console.log('❌ No shifts selected, aborting delete');
      return;
    }

    const shiftsToDelete = shifts.filter(s => selectedShiftIds.has(s.id));
    const shiftNames = shiftsToDelete.map(s => s.business_name || '不明').join(', ');

    if (!confirm(`選択した${selectedShiftIds.size}件のシフトを削除しますか？\n${shiftNames}`)) {
      return;
    }

    try {
      // Delete from database
      const { error } = await supabase
        .from('shifts')
        .delete()
        .in('id', Array.from(selectedShiftIds));

      if (error) throw error;

      // Update local state
      const updatedShifts = shifts.filter(s => !selectedShiftIds.has(s.id));
      setShifts(updatedShifts);
      setSelectedShiftIds(new Set());
      setHasChanges(false);
      
      toast.success(`${shiftsToDelete.length}件のシフトを削除しました`);
    } catch (error) {
      console.error('❌ Error deleting shifts:', error);
      toast.error('シフトの削除に失敗しました');
    }
  }, [selectedShiftIds, shifts]);

  const savePeriodChanges = async () => {
    if (!hasChanges) return;

    setIsLoading(true);
    try {
      console.log('💾 Saving period shifts to database...');
      
      // Get all shift IDs that have been modified
      const shiftIds = periodShifts.map(s => s.id);
      
      // Update each shift individually
      for (const shift of periodShifts) {
        const { error } = await supabase
          .from('shifts')
          .update({
            employee_id: shift.employee_id,
            date: shift.date,
          })
          .eq('id', shift.id);

        if (error) {
          console.error('❌ Error updating shift:', error);
          throw error;
        }
      }

      console.log('✅ Saved', periodShifts.length, 'shifts');
      toast.success('変更を保存しました');
      setHasChanges(false);
      
      // Reload period data
      await loadPeriodShifts();
    } catch (error) {
      console.error('Error saving period changes:', error);
      toast.error('保存中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!hasChanges) return;

    setIsLoading(true);
    try {
      console.log('💾 Saving shifts to database...');
      
      // Delete existing shifts for the date and location
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('date', selectedDate)
        .eq('location', selectedLocation === 'all' ? undefined : selectedLocation);

      if (deleteError) {
        console.error('❌ Error deleting old shifts:', deleteError);
        throw deleteError;
      }

      // Insert updated shifts
      const shiftsToInsert = shifts.map(s => ({
        employee_id: s.employee_id,
        business_master_id: s.business_master_id,
        date: s.date,
        location: s.location || selectedLocation,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('shifts')
        .insert(shiftsToInsert);

      if (insertError) {
        console.error('❌ Error inserting shifts:', insertError);
        throw insertError;
      }

      console.log('✅ Saved', shiftsToInsert.length, 'shifts');
      toast.success('変更を保存しました');
      setHasChanges(false);
      
      // Reload data to refresh
      await loadData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('保存中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeBarStyle = (startTime: string, endTime: string) => {
    const timeToHour = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      let adjustedHours = hours - 4;
      if (adjustedHours < 0) adjustedHours += 24;
      return adjustedHours + minutes / 60;
    };

    const startHour = timeToHour(startTime);
    const endHour = timeToHour(endTime);
    
    const left = (startHour / 24) * 100;
    const width = ((endHour - startHour) / 24) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">シフト管理（マトリクス表示）</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCopyDialog(true)} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            シフトをコピー
          </Button>
          {hasChanges && (
            <Button onClick={saveChanges} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              変更を保存
            </Button>
          )}
          <Link to="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              ホーム
            </Button>
          </Link>
        </div>
      </div>

      {/* Location Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            拠点選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="拠点を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="川越">川越</SelectItem>
              <SelectItem value="東京">東京</SelectItem>
              <SelectItem value="川口">川口</SelectItem>
              {locations.filter(loc => !['川越', '東京', '川口'].includes(loc)).map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="period">期間勤務割確認</TabsTrigger>
          <TabsTrigger value="daily">日付勤務割確認</TabsTrigger>
        </TabsList>

        {/* Period View Tab */}
        <TabsContent value="period" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>期間指定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period-start-date">開始日</Label>
                  <Input
                    id="period-start-date"
                    type="date"
                    value={periodStartDate}
                    onChange={(e) => {
                      console.log('🔍 [DEBUG] Start date changed:', e.target.value);
                      setPeriodStartDate(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-end-date">終了日</Label>
                  <Input
                    id="period-end-date"
                    type="date"
                    value={periodEndDate}
                    onChange={(e) => {
                      console.log('🔍 [DEBUG] End date changed:', e.target.value);
                      setPeriodEndDate(e.target.value);
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadPeriodShifts} disabled={isLoading} className="w-full">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    実行
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Period Shifts Matrix */}
          {periodShifts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>期間勤務割マトリクス</CardTitle>
                  <div className="flex gap-2">
                    {hasChanges && activeTab === 'period' && (
                      <Button onClick={savePeriodChanges} disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        変更を保存
                      </Button>
                    )}
                    <Button 
                      variant={periodViewMode === 'employee' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodViewMode('employee')}
                    >
                      運転士ごと
                    </Button>
                    <Button 
                      variant={periodViewMode === 'business' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodViewMode('business')}
                    >
                      業務ごと
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {periodViewMode === 'employee' && periodEmployeeViewData ? (
                  /* Employee View: Employees x Dates (Multi-day support) */
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2 text-left sticky left-0 bg-gray-100 z-10">従業員名</th>
                          {periodEmployeeViewData.dates.map(date => (
                            <th key={date} className="border p-2 text-center min-w-[120px]">{date}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periodEmployeeViewData.employees.map(employee => {
                          const employeeSets = periodEmployeeViewData.employeeMultiDaySets.get(employee) || new Map();
                          return (
                            <tr key={employee} className="hover:bg-gray-50">
                              <td className="border p-2 font-medium sticky left-0 bg-white z-10">{employee}</td>
                              {periodEmployeeViewData.dates.map((date, dateIdx) => {
                                let skipCell = false;
                                employeeSets.forEach((set: any) => {
                                  const startIdx = periodEmployeeViewData.dates.indexOf(set.startDate);
                                  const endIdx = startIdx + set.totalDays - 1;
                                  if (dateIdx > startIdx && dateIdx <= endIdx) {
                                    skipCell = true;
                                  }
                                });
                                if (skipCell) return null;
                                
                                const businesses = periodEmployeeViewData.shiftMap.get(employee)?.get(date) || [];
                                let colspan = 1;
                                const multiDayBusiness = businesses.find((b: any) => b.isMultiDay);
                                if (multiDayBusiness) {
                                  colspan = multiDayBusiness.colspan;
                                }
                                
                                const employeeShift = periodShifts.find(s => s.employee_name === employee);
                                const cellId = `period-cell-${employeeShift?.employee_id || employee.replace(/\s/g, '_')}-${date}`;
                                
                                return (
                                  <td 
                                    key={date} 
                                    colSpan={colspan} 
                                    className={`border p-2 text-center cursor-pointer hover:bg-blue-50 transition-colors ${
                                      multiDayBusiness ? 'bg-purple-50' : ''
                                    }`}
                                    onClick={(e) => { console.log("CLICKED EMPTY CELL", slot); window.alert("CLICKED"); window.alert("CLICKED"); console.log("🔥 [DEBUG] DIV CLICKED", e); window.alert("DIV CLICKED");
                                      const employeeShift = periodShifts.find(s => s.employee_name === employee);
                                      if (employeeShift) {
                                        const businessNames = businesses.map((b: any) => b.name).join(', ');
                                        handleCellClick({
                                          employeeId: employeeShift.employee_id,
                                          employeeName: employee,
                                          businessId: '', // Period viewでは業務IDは不要
                                          businessName: businessNames || '未割り当て',
                                          date: date,
                                        });
                                      }
                                    }}
                                  >
                                    {businesses.length > 0 ? (
                                      <div className="space-y-1">
                                        {businesses.map((business: any, idx: number) => (
                                          <div key={idx} className="text-xs bg-blue-100 rounded px-1 py-0.5">
                                            {business.name}
                                          </div>
                                        ))}  
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : periodViewMode === 'business' && periodBusinessViewData ? (
                  /* Business View: Businesses x Dates */
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2 text-left sticky left-0 bg-gray-100 z-10">業務名</th>
                          {periodBusinessViewData.dates.map(date => (
                            <th key={date} className="border p-2 text-center min-w-[120px]">{date}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periodBusinessViewData.businesses.map(business => (
                          <tr key={business} className="hover:bg-gray-50">
                            <td className="border p-2 font-medium sticky left-0 bg-white z-10">{business}</td>
                            {periodBusinessViewData.dates.map(date => {
                              const employees = periodBusinessViewData.shiftMap.get(business)?.get(date) || [];
                              return (
                                <td key={date} className="border p-2 text-center">
                                  {employees.length > 0 ? (
                                    <div className="space-y-1">
                                      {employees.map((employee, idx) => (
                                        <div key={idx} className="text-xs bg-green-100 rounded px-1 py-0.5">
                                          {employee}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Daily View Tab */}
        <TabsContent value="daily" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>日付選択</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">日付</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadData} disabled={isLoading} className="w-full">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    再読み込み
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button onClick={openExportDialog} disabled={isLoading} className="w-full" variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Excel出力
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Excel Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excel出力</DialogTitle>
            <DialogDescription>
              シフトデータをExcelファイルとして出力します。出力する期間を指定してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="export-start-date" className="text-right">
                開始日
              </Label>
              <Input
                id="export-start-date"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="export-end-date" className="text-right">
                終了日
              </Label>
              <Input
                id="export-end-date"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={exportToExcel}>
              出力
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Matrix Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              シフトマトリクス - {selectedDate}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={dailyViewMode === 'employee' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDailyViewMode('employee')}
              >
                運転士ごと
              </Button>
              <Button 
                variant={dailyViewMode === 'business' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDailyViewMode('business')}
              >
                業務ごと
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dailyViewMode === 'employee' ? (
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Time Header */}
                <div className="flex border-b-2 border-gray-300 bg-gray-100 sticky top-0 z-10">
                  <div className="w-40 p-2 border-r-2 border-gray-300 font-semibold flex items-center">
                    従業員名
                  </div>
                  <div className="flex-1 relative">
                    <div className="flex">
                      {timeSlots.map((slot, index) => (
                        <div
                          key={index}
                          className="flex-1 p-2 text-center text-xs border-r border-gray-300 font-medium"
                        >
                          {slot.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Employee Rows */}
                {allEmployees
                  .filter(emp => selectedLocation === 'all' || emp.office === selectedLocation)
                  .sort((a, b) => {
                    // Sort employees with roll call shifts to the top
                    const aHasRollCall = shifts.some(s => 
                      s.employee_id === a.employee_id && 
                      (s.business_name?.includes('点呼') || s.business_group?.includes('点呼'))
                    );
                    const bHasRollCall = shifts.some(s => 
                      s.employee_id === b.employee_id && 
                      (s.business_name?.includes('点呼') || s.business_group?.includes('点呼'))
                    );
                    
                    if (aHasRollCall && !bHasRollCall) return -1;
                    if (!aHasRollCall && bHasRollCall) return 1;
                    
                    // Otherwise, sort by name
                    return (a.name || '').localeCompare(b.name || '');
                  })
                  .map((employee) => {
                    const employeeShifts = shifts.filter(s => s.employee_id === employee.employee_id);
                    
                    return (
                      <div key={employee.employee_id} className="flex border-b border-gray-200 hover:bg-gray-50">
                        {/* Employee Name Column */}
                        <div className="w-40 p-2 border-r-2 border-gray-300 font-medium flex items-center">
                          {employee.name}
                        </div>
                        
                        {/* Time Grid Column */}
                        <div className="flex-1 relative" style={{ height: '60px' }}>
                          {/* Time Grid Background */}
                          <div className="absolute inset-0 flex">
                            {timeSlots.map((slot, index) => (
                              <div
                                key={`${employee.employee_id}-${index}`}
                                className="flex-1 min-h-[40px] p-1 border-r border-b bg-gray-50"
                              >
                                {/* Empty cell background */}
                              </div>
                            ))}
                          </div>
                          
                          {/* Empty Cells (clickable) */}
                          {(() => {
                            const emptySlots = calculateEmptyTimeSlots(employeeShifts);
                            return emptySlots.map((slot, index) => {
                              const calculatePosition = (hour: number) => {
                                const adjustedHour = (hour - 4 + 24) % 24;
                                return (adjustedHour / 24) * 100;
                              };
                              const left = calculatePosition(slot.startHour);
                              const width = calculatePosition(slot.endHour) - left;
                              const isSelected = firstCell?.employeeId === employee.employee_id && firstCell?.businessId === '';
                              
                              return (
                                <div
                                  key={`empty-${employee.employee_id}-${index}`}
                                  style={{ 
                                    left: `${left}%`, 
                                    width: `${width}%` 
                                  }}
                                  onClick={(e) => { console.log("CLICKED EMPTY CELL", slot); window.alert("CLICKED"); window.alert("CLICKED"); console.log("🔥 [DEBUG] DIV CLICKED", e); window.alert("DIV CLICKED");
                                    console.log('🟢 [EmptyCell] Clicked (inline):', { employeeId: employee.employee_id, employeeName: employee.name, startHour: slot.startHour, endHour: slot.endHour });
                                    handleCellClick({
                                      employeeId: employee.employee_id,
                                      employeeName: employee.name,
                                      businessId: '',
                                      businessName: '未割り当て',
                                      date: selectedDate,
                                      shiftId: undefined,
                                    });
                                  }}
                                  style={{ pointerEvents: "auto", zIndex: 10000, position: "absolute", backgroundColor: "rgba(255, 0, 0, 0.2)", border: "5px solid red", top: "0", bottom: "0", left: "0", right: "0", minHeight: "40px", minWidth: "100px", cursor: "pointer", visibility: "visible", opacity: 1, display: "block", pointerEvents: "all", border: "10px solid blue", outline: "10px solid green", boxShadow: "0 0 20px 10px rgba(255, 255, 0, 0.5)", color: "black", fontSize: "20px", fontWeight: "bold", transform: "scale(1.1)", border: "20px solid purple", background: "yellow", border: "30px solid orange", border: "40px solid pink", border: "50px solid red", border: "60px solid black", border: "70px solid white", border: "80px solid cyan", border: "90px solid magenta", border: "100px solid lime", border: "110px solid brown", border: "120px solid gray", border: "130px solid navy", border: "140px solid teal", border: "150px solid olive", border: "160px solid silver", border: "170px solid gold", border: "180px solid pink", border: "190px solid maroon", border: "200px solid indigo", border: "210px solid violet", border: "220px solid turquoise", border: "230px solid beige", border: "240px solid coral", border: "250px solid crimson", border: "260px solid darkgreen" }} className={`absolute top-2 bottom-2 rounded border-2 border-dashed flex items-center justify-center text-xs font-medium transition-all z-10 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-orange-100 border-orange-400 hover:bg-orange-200' 
                                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                  }`}
                                  title={`${employee.name}の空き時間帯（${slot.startHour}:00 - ${slot.endHour}:00）をクリックしてシフトを移動`}
                                >
                                  {isSelected && (
                                    <span className="text-orange-600 font-semibold">選択中</span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                          
                          {/* Shift Bars */}
                          {employeeShifts.map((shift) => {
                            const barStyle = getTimeBarStyle(
                              shift.start_time || '09:00:00',
                              shift.end_time || '17:00:00'
                            );
                            
                            return (
                              <ShiftBar
                                key={shift.id}
                                employeeId={shift.employee_id}
                                employeeName={shift.employee_name || employee.name}
                                shiftId={shift.id}
                                businessId={shift.business_master_id}
                                businessName={shift.business_name}
                                date={shift.date}
                                startTime={shift.start_time}
                                endTime={shift.end_time}
                                barStyle={barStyle}
                                isSelected={isCellSelected({
                                  employeeId: shift.employee_id,
                                  businessId: shift.business_master_id,
                                  date: shift.date,
                                })}
                                onClick={() => handleCellClick({
                                  employeeId: shift.employee_id,
                                  employeeName: shift.employee_name || employee.name,
                                  businessId: shift.business_master_id,
                                  businessName: shift.business_name,
                                  date: shift.date,
                                  shiftId: shift.id,
                                })}
                                colorScheme='blue'
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                
                {allEmployees.filter(emp => selectedLocation === 'all' || emp.office === selectedLocation).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    従業員データがありません
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Business View: Businesses x Time */
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Time Header */}
                <div className="flex border-b-2 border-gray-300 bg-gray-100 sticky top-0 z-10">
                  <div className="w-40 p-2 border-r-2 border-gray-300 font-semibold flex items-center">
                    業務名
                  </div>
                  <div className="flex-1 relative">
                    <div className="flex">
                      {timeSlots.map((slot, index) => (
                        <div
                          key={index}
                          className="flex-1 p-2 text-center text-xs border-r border-gray-300 font-medium"
                        >
                          {slot.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Business Rows */}
                {(() => {
                  const businesses = [...new Set(shifts.map(s => s.business_name))]
                    .sort((a, b) => {
                      // 点呼業務を一番上に表示
                      const aIsRollCall = a.includes('点呼');
                      const bIsRollCall = b.includes('点呼');
                      if (aIsRollCall && !bIsRollCall) return -1;
                      if (!aIsRollCall && bIsRollCall) return 1;
                      return a.localeCompare(b);
                    });

                  return businesses.map((business) => {
                    const businessShifts = shifts.filter(s => s.business_name === business);
                    
                    return (
                      <div key={business} className="flex border-b border-gray-200 hover:bg-gray-50">
                        {/* Business Name Column */}
                        <div className="w-40 p-2 border-r-2 border-gray-300 font-medium flex items-center">
                          {business}
                        </div>
                        
                        {/* Time Grid Column */}
                        <div className="flex-1 relative" style={{ height: '60px' }}>
                          {/* Time Grid Background */}
                          <div className="absolute inset-0 flex">
                            {timeSlots.map((slot, index) => (
                              <div
                                key={`${business}-${index}`}
                                className="flex-1 min-h-[40px] p-1 border-r border-b bg-gray-50"
                              >
                                {/* Empty cell background */}
                              </div>
                            ))}
                          </div>
                          
                          {/* Shift Bars */}
                          {businessShifts.map((shift) => {
                            const barStyle = getTimeBarStyle(
                              shift.start_time || '09:00:00',
                              shift.end_time || '17:00:00'
                            );
                            
                            return (
                              <ShiftBar
                                key={shift.id}
                                employeeId={shift.employee_id}
                                employeeName={shift.employee_name}
                                shiftId={shift.id}
                                businessId={shift.business_master_id}
                                businessName={shift.business_name}
                                date={shift.date}
                                startTime={shift.start_time}
                                endTime={shift.end_time}
                                barStyle={barStyle}
                                isSelected={isCellSelected({
                                  employeeId: shift.employee_id,
                                  businessId: shift.business_master_id,
                                  date: shift.date,
                                })}
                                onClick={() => handleCellClick({
                                  employeeId: shift.employee_id,
                                  employeeName: shift.employee_name,
                                  businessId: shift.business_master_id,
                                  businessName: shift.business_name,
                                  date: shift.date,
                                  shiftId: shift.id,
                                })}
                                colorScheme='green'
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            未割り当て従業員 ({unassignedEmployees.length}名)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {unassignedEmployees.map((emp) => (
              <Badge key={emp.employee_id} variant="secondary">
                {emp.name}
              </Badge>
            ))}
            {unassignedEmployees.length === 0 && (
              <p className="text-gray-500">すべての従業員がアサインされています</p>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
  
  {/* Shift Copy Dialog */}
  <ShiftCopyDialog
    open={showCopyDialog}
    onOpenChange={setShowCopyDialog}
    locations={locations}
    onCopyComplete={() => {
      if (activeTab === 'period') {
        loadPeriodShifts();
      } else {
        loadShifts();
      }
      toast.success('シフトのコピーが完了しました');
    }}
  />
  
  {/* Swap Confirm Dialog - 現在はwindow.confirmを使用しているためコメントアウト */}
  {/* <SwapConfirmDialog
    open={isDialogOpen}
    onOpenChange={setIsDialogOpen}
    swapOperation={getSwapOperation()}
    onConfirm={handleSwapConfirm}
    onCancel={handleSwapCancel}
    isLoading={isSwapping}
  /> */}
  </div>
  );
}

