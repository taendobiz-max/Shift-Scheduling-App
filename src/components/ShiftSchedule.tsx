import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, Users, RefreshCw, AlertTriangle, Home, Save, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShiftCopyDialog } from '@/components/ShiftCopyDialog';
import { useShiftSelection } from '@/hooks/useShiftSelection';
import { useShiftData } from '@/hooks/useShiftData';
import { SwapConfirmDialog } from '@/components/shift-schedule/SwapConfirmDialog';
import { CellPosition } from '@/types/shift';
import { checkShiftRules, RuleViolation } from '@/utils/ruleChecker';
import { AddSpotBusinessDialog } from '@/components/AddSpotBusinessDialog';
import DeleteShiftsModal from '@/components/DeleteShiftsModal';
import { AssignEmployeeDialog } from '@/components/AssignEmployeeDialog';

interface ShiftData {
  id: string;
  date: string;
  employee_id: string;
  employee_name?: string;
  employee_group?: string; // 従業員の班（東京のみ）
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
  営業所?: string;
  開始時間?: string;
  終了時間?: string;
  業務グループ?: string;
  業務タイプ?: string;
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
  onContextMenu,
  colorScheme = 'blue',
  isSpotBusiness = false,
  viewMode = 'employee'
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
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  colorScheme?: 'blue' | 'green';
  isSpotBusiness?: boolean;
  viewMode?: 'employee' | 'business';
}) => {
  // デバッグログを追加
  console.log('🔍 [ShiftBar Debug]', {
    employeeName,
    businessName,
    startTime,
    endTime,
    barStyle,
    hasBarStyle: !!barStyle,
    hasBusinessName: !!businessName
  });

  // barStyleが提供されている場合は、シフトバーとしてレンダリング
  if (barStyle && businessName) {
    console.log('✅ [ShiftBar] Rendering as shift bar');
    
    // 表示モードに応じて表示内容を変更
    const displayText = viewMode === 'employee' 
      ? businessName // 運転士ごと → 業務名のみ
      : employeeName; // 業務ごと → 名前のみ
    
    // ツールチップに全情報を表示
    const tooltipText = `${employeeName} - ${businessName}\n${startTime?.substring(0, 5)} - ${endTime?.substring(0, 5)}`;
    
    return (
      <div
        style={{ left: barStyle.left, width: barStyle.width }}
        onClick={onClick}
        onContextMenu={onContextMenu}
        title={tooltipText}
        className={`absolute top-2 bottom-2 rounded px-2 flex items-center justify-center text-white text-xs font-medium shadow-md transition-colors z-50 cursor-pointer ${
          isSelected 
            ? 'bg-orange-500 hover:bg-orange-600 ring-2 ring-orange-300' 
            : isSpotBusiness 
              ? 'bg-cyan-400 hover:bg-cyan-500' 
              : colorScheme === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        <span className="truncate">{displayText}</span>
      </div>
    );
  }
  
  // businessNameが提供されているがbarStyleがない場合は、期間シフトボックスとしてレンダリング
  if (businessName && !barStyle) {
    console.log('⚠️ [ShiftBar] Rendering as period shift box (RED)');
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
  console.log('❓ [ShiftBar] Rendering as badge');
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
  const [selectedLocation, setSelectedLocation] = useState('川越');
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  const [businessMasters, setBusinessMasters] = useState<BusinessMaster[]>([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState<EmployeeData[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shiftId: string } | null>(null);
  
  // 未アサインポップアップの状態管理
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{name: string; key: string} | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{employee: EmployeeData; hasVacation: boolean}>>([]);
  
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
  const [showRuleCheckDialog, setShowRuleCheckDialog] = useState(false);
  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([]);
  const [isCheckingRules, setIsCheckingRules] = useState(false);
  const [showSpotBusinessDialog, setShowSpotBusinessDialog] = useState(false);
  const [spotBusinessDate, setSpotBusinessDate] = useState<string>('');
  const [spotBusinessEmployeeId, setSpotBusinessEmployeeId] = useState<string>('');
  const [spotBusinessEmployeeName, setSpotBusinessEmployeeName] = useState<string>('');
  const [showDeleteShiftsModal, setShowDeleteShiftsModal] = useState(false);
  
  // ポップアップアサイン機能のstate
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    employeeId?: string;
    employeeName?: string;
    businessId?: string;
    businessName?: string;
    date: string;
  } | null>(null);


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
      // 期間内の日付のみを表示
      const dates = [...new Set(periodShifts.map(s => s.date))]
        .filter(date => date >= periodStartDate && date <= periodEndDate)
        .sort();
      console.log('🔍 [DEBUG] Filtered dates:', dates);
      
      // 対象日付のシフトのみを処理
      const limitedShifts = periodShifts.filter(s => dates.includes(s.date));
      console.log('🔍 [DEBUG] Limited shifts count:', limitedShifts.length);
      
      const employeeNames = [...new Set(limitedShifts.map(s => s.employee_name))];
      const employees = employeeNames
        .map(name => {
          const shift = limitedShifts.find(s => s.employee_name === name);
          const employee = allEmployees.find(e => e.employee_id === shift?.employee_id);
          // employeesテーブルに存在しない従業員は除外
          if (!employee) return null;
          return { name, display_order: employee.display_order || 9999 };
        })
        .filter(e => e !== null) // nullを除外
        .sort((a, b) => a.display_order - b.display_order)
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
      
      // 複数日業務セットの開始日を期間内に調整
      console.log('🔍 [DEBUG] Adjusting multiDaySets to period range');
      console.log('🔍 [DEBUG] dates:', dates);
      console.log('🔍 [DEBUG] multiDaySets before adjustment:', Array.from(multiDaySets.values()));
      
      multiDaySets.forEach(set => {
        console.log('🔍 [DEBUG] Processing set:', {
          employeeName: set.employeeName,
          startDate: set.startDate,
          totalDays: set.totalDays,
          businessName: set.businessName
        });
        console.log('🔍 [DEBUG] dates.includes(set.startDate):', dates.includes(set.startDate));
        // 開始日が期間外の場合、期間の最初の日付に調整
        if (!dates.includes(set.startDate)) {
          console.log('🔍 [DEBUG] startDate not in dates:', set.startDate);
          const periodStartIdx = dates.findIndex((d: string) => d > set.startDate);
          if (periodStartIdx !== -1) {
            console.log('🔍 [DEBUG] Adjusting startDate from', set.startDate, 'to', dates[periodStartIdx]);
            set.startDate = dates[periodStartIdx];
          } else if (dates.length > 0) {
            console.log('🔍 [DEBUG] Adjusting startDate from', set.startDate, 'to', dates[0]);
            set.startDate = dates[0];
          }
        }
        // totalDaysを期間内の日数に制限
        const startIdx = dates.indexOf(set.startDate);
        if (startIdx !== -1) {
          const remainingDays = dates.length - startIdx;
          if (set.totalDays > remainingDays) {
            console.log('🔍 [DEBUG] Adjusting totalDays from', set.totalDays, 'to', remainingDays);
            set.totalDays = remainingDays;
          }
        }
      });
      
      console.log('🔍 [DEBUG] multiDaySets after adjustment:', Array.from(multiDaySets.values()));
      
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
      limitedShifts.forEach((shift) => {
        if (!shift.employee_name) {
          return;
        }
        // 期間外のシフトをスキップ
        if (!dates.includes(shift.date)) {
          console.log('🚫 [DEBUG] Skipping shift outside period:', {
            employeeName: shift.employee_name,
            businessName: shift.business_name,
            date: shift.date
          });
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
            // colspanを期間内に強制的に制限
            const dateIndex = dates.indexOf(shift.date);
            const remainingDays = dates.length - dateIndex;
            const actualColspan = Math.min(set.totalDays, remainingDays);
            console.log('🔍 [DEBUG] Calculating colspan:', {
              employeeName: shift.employee_name,
              businessName: baseName,
              date: shift.date,
              dateIndex,
              remainingDays,
              originalTotalDays: set.totalDays,
              actualColspan
            });
            employeeShifts.get(shift.date).push({
              name: baseName,
              isMultiDay: true,
              colspan: actualColspan,
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
    console.error("[DEBUG] periodBusinessViewData useMemo CALLED", { periodViewMode, businessMastersLength: businessMasters.length, selectedLocation });
    if (periodViewMode !== 'business') return null;
    
    try {
      // 期間内の日付のみを表示
      const dates = [...new Set(periodShifts.map(s => s.date))]
        .filter(date => date >= periodStartDate && date <= periodEndDate)
        .sort();
      
      // business_masterから業務リストを取得（シフトの有無に関わらず全業務を表示）
      console.log('🔍 [DEBUG] periodBusinessViewData - businessMasters:', {
        total: businessMasters.length,
        selectedLocation,
        sample: businessMasters[0],
        rollCallBusinesses: businessMasters.filter(b => b.業務名?.includes('点呼')).map(b => ({ 業務名: b.業務名, 営業所: b.営業所 }))
      });
      
      const businesses = businessMasters
        .filter(b => b.営業所 === selectedLocation)
        .map(b => b.業務名)
        .sort((a, b) => {
          // 点呼業務を一番上に表示
          const aIsRollCall = a.includes('点呼');
          const bIsRollCall = b.includes('点呼');
          if (aIsRollCall && !bIsRollCall) return -1;
          if (!aIsRollCall && bIsRollCall) return 1;
          return a.localeCompare(b);
        });
      
      console.log('🔍 [DEBUG] periodBusinessViewData - filtered businesses:', {
        count: businesses.length,
        businesses: businesses.slice(0, 10),
        rollCallBusinesses: businesses.filter(b => b?.includes('点呼'))
      });
      
      const shiftMap = new Map();
      periodShifts.forEach(shift => {
        // employeesテーブルに存在しない従業員のシフトは除外
        const employee = allEmployees.find(e => e.employee_id === shift.employee_id);
        if (!employee) return;
        
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
  }, [periodShifts, periodViewMode, businessMasters, selectedLocation, periodStartDate, periodEndDate]);
  
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

  // セル選択のハンドラー
  const handleCellClick = (cell: CellPosition, e?: React.MouseEvent) => {
    console.log('🟠 [DEBUG] handleCellClick called:', cell);
    console.log("🔍 [DEBUG] handleCellClick:", cell);
    
    // Shiftキーでの複数選択の場合、シフト削除用の選択を行う
    if (e?.shiftKey && cell.shiftId) {
      e.preventDefault();
      e.stopPropagation();
      const newSelected = new Set(selectedShiftIds);
      if (newSelected.has(cell.shiftId)) {
        newSelected.delete(cell.shiftId);
      } else {
        newSelected.add(cell.shiftId);
      }
      setSelectedShiftIds(newSelected);
      return;
    }
    
    // 通常のクリックはシフト入れ替え用
    // 削除用の選択をクリア
    setSelectedShiftIds(new Set());
    selectCell(cell);
  };
  
  // ポップアップアサイン機能のハンドラー
  const handleAssignPopupOpen = (
    date: string,
    employeeId?: string,
    employeeName?: string,
    businessId?: string,
    businessName?: string
  ) => {
    console.log('🟠 [DEBUG] handleAssignPopupOpen called:', { date, employeeId, employeeName, businessId, businessName });
    setAssignTarget({ date, employeeId, employeeName, businessId, businessName });
    setShowAssignPopup(true);
  };
  
  const handleAssignBusiness = async (business: BusinessMaster) => {
    if (!assignTarget) return;
    
    console.log('🟠 [DEBUG] handleAssignBusiness called:', { assignTarget, business });
    
    try {
      // APIサーバー経由でアサイン
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: assignTarget.employeeId,
          business_id: business.業務id,
          date: assignTarget.date,
          location: selectedLocation,
        }),
      });
      
      if (response.ok) {
        toast.success('アサインしました');
        setShowAssignPopup(false);
        setAssignTarget(null);
        // データ再読み込み
        loadData();
      } else {
        const error = await response.json();
        toast.error(`アサインに失敗しました: ${error.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error assigning business:', error);
      toast.error('アサインに失敗しました');
    }
  };
  
  const handleAssignEmployee = async (employee: { employee_id: string; employee_name: string }) => {
    if (!assignTarget || !assignTarget.businessId) return;
    
    console.log('🟠 [DEBUG] handleAssignEmployee called:', { assignTarget, employee });
    
    try {
      // 業務マスタから業務情報を取得
      const business = businessMasters.find(b => b.業務id === assignTarget.businessId);
      if (!business) {
        toast.error('業務情報が見つかりません');
        return;
      }
      
      // APIサーバー経由でアサイン
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.employee_id,
          business_id: assignTarget.businessId,
          date: assignTarget.date,
          location: selectedLocation,
        }),
      });
      
      if (response.ok) {
        toast.success('アサインしました');
        setShowAssignPopup(false);
        setAssignTarget(null);
        // データ再読み込み
        loadData();
      } else {
        const error = await response.json();
        toast.error(`アサインに失敗しました: ${error.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error assigning employee:', error);
      toast.error('アサインに失敗しました');
    }
  };
  
  // スワップ確認ダイアログのハンドラー
  const handleSwapConfirm = async () => {
    const operation = getSwapOperation();
    console.log("🔍 [DEBUG] operation:", operation);
    console.log("🔍 [DEBUG] handleSwapConfirm called");
    if (!operation) return;
    
    const result = await swapShifts(operation.from, operation.to);
    if (result.success) {
      toast.success('シフトを入れ替えました');
      clearSelection();
      // データを再読み込み
      loadData();
    } else {
      toast.error('シフトの入れ替えに失敗しました');
    }
  };
  
  const handleSwapCancel = () => {
    clearSelection();
  };

  // 右クリックメニューのハンドラー
  const handleContextMenu = (e: React.MouseEvent, shiftId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, shiftId });
    // 右クリックしたシフトを選択状態に追加
    if (!selectedShiftIds.has(shiftId)) {
      setSelectedShiftIds(new Set([shiftId]));
    }
  };

  // 右クリックメニューからの削除
  const handleDeleteFromContextMenu = async () => {
    setContextMenu(null);
    await handleDeleteSelectedShifts();
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

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

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
        .select('employee_id, name, office, team, display_order');
      
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
        console.log('🔍 [DEBUG] Sample business master:', businessData[0]);
        console.log('🔍 [DEBUG] Business master field names:', businessData[0] ? Object.keys(businessData[0]) : 'No data');
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
          
          // スポット業務の場合、departure_timeとreturn_timeを使用
          let startTime = business?.開始時間 || '09:00:00';
          let endTime = business?.終了時間 || '17:00:00';
          
          if (shift.is_spot_business && shift.departure_time && shift.return_time) {
            startTime = shift.departure_time;
            endTime = shift.return_time;
          }
          
          return {
            ...shift,
            employee_name: employee?.name || shift.employee_id,
            employee_group: undefined,
            business_name: business?.業務名 || shift.business_name || shift.business_master_id,
            location: business?.営業所 || undefined,
            start_time: startTime,
            end_time: endTime,
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
          location: selectedLocation,
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
          
          // スポット業務の場合、departure_timeとreturn_timeを使用
          let startTime = business?.開始時間 || '09:00:00';
          let endTime = business?.終了時間 || '17:00:00';
          
          if (shift.is_spot_business && shift.departure_time && shift.return_time) {
            startTime = shift.departure_time;
            endTime = shift.return_time;
          }
          
          return {
            ...shift,
            employee_name: employee?.name || shift.employee_id,
            employee_group: undefined,
            business_name: business?.業務名 || shift.business_name || shift.business_master_id,
            location: business?.営業所 || undefined,
            start_time: startTime,
            end_time: endTime,
          };
        });
        console.log('🔍 [DEBUG] Shifts enriched');
        
        console.log('🔍 [DEBUG] Filtering by location:', selectedLocation);
        const filtered = enrichedShifts.filter(s => s.location === selectedLocation);
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
    const filtered = shifts.filter(s => s.location === selectedLocation);
    const filteredEmployees = allEmployees.filter(e => e.office === selectedLocation);
    calculateUnassignedEmployees(filtered, filteredEmployees);
  };

  const calculateUnassignedEmployees = (shiftsData: ShiftData[], employeesData: EmployeeData[]) => {
    const assignedEmployeeIds = new Set(shiftsData.map(s => s.employee_id));
    const unassigned = employeesData.filter(e => !assignedEmployeeIds.has(e.employee_id));
    setUnassignedEmployees(unassigned);
    console.log('🔍 Unassigned employees:', unassigned.length);
  };

  // 未アサイン業務クリックのハンドラー
  const handleUnassignedBusinessClick = async (businessName: string, businessKey: string) => {
    console.log('👥 Unassigned business clicked:', businessName);
    setSelectedBusiness({ name: businessName, key: businessKey });
    
    // 出勤可能な従業員と休暇登録済み従業員を取得
    try {
      // 当日の休暇登録を取得
      const { data: vacations, error: vacationError } = await supabase
        .from('vacation_master')
        .select('employee_id, employee_name')
        .eq('vacation_date', selectedDate)
        .eq('office', selectedLocation);
      
      if (vacationError) {
        console.error('❌ Error loading vacations:', vacationError);
        toast.error('休暇情報の読み込みに失敗しました');
        return;
      }
      
      const vacationEmployeeIds = new Set((vacations || []).map(v => v.employee_id));
      
      // 当該業務に既にアサインされている従業員を除外
      const assignedEmployeeIds = new Set(
        shifts
          .filter(s => s.business_name === businessName.replace(/ \(.*班\)$/, '')) // 班名を除外して比較
          .map(s => s.employee_id)
      );
      
      // 利用可能な従業員リストを作成（出勤可能+休暇登録済み）
      const locationEmployees = allEmployees.filter(e => e.office === selectedLocation);
      const available = locationEmployees
        .filter(e => !assignedEmployeeIds.has(e.employee_id))
        .map(employee => ({
          employee,
          hasVacation: vacationEmployeeIds.has(employee.employee_id)
        }));
      
      setAvailableEmployees(available);
      setShowAssignDialog(true);
    } catch (error) {
      console.error('❌ Error loading available employees:', error);
      toast.error('従業員情報の読み込みに失敗しました');
    }
  };

  // 既存のhandleAssignEmployee関数は566行目に移動済み

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
    
    console.log('🖘️ New selectedShiftIds:', Array.from(newSelected));
    setSelectedShiftIds(newSelected);
  };

  // Handle delete selected shifts
  const handleDeleteSelectedShifts = useCallback(async () => {
    console.log('❌ Delete triggered, selectedShiftIds:', Array.from(selectedShiftIds));
    console.log('❌ selectedShiftIds.size:', selectedShiftIds.size);
    console.log('❌ activeTab:', activeTab);
    if (selectedShiftIds.size === 0) {
      console.log('❌ No shifts selected, aborting delete');
      return;
    }

    // 現在のビューに応じて適切な配列を使用
    const currentShifts = activeTab === 'daily' ? shifts : periodShifts;
    console.log('❌ currentShifts.length:', currentShifts.length);
    const shiftsToDelete = currentShifts.filter(s => selectedShiftIds.has(s.id));
    console.log('❌ shiftsToDelete.length:', shiftsToDelete.length);
    const shiftNames = shiftsToDelete.map(s => s.business_name || '不明').join(', ');

    if (!confirm(`選択した${shiftsToDelete.length}件のシフトを削除しますか？\n${shiftNames}`)) {
      return;
    }

    try {
      // Delete from database
      const { error } = await supabase
        .from('shifts')
        .delete()
        .in('id', Array.from(selectedShiftIds));

      if (error) throw error;

      // Update local state based on current view
      if (activeTab === 'daily') {
        const updatedShifts = shifts.filter(s => !selectedShiftIds.has(s.id));
        setShifts(updatedShifts);
      } else {
        const updatedShifts = periodShifts.filter(s => !selectedShiftIds.has(s.id));
        setPeriodShifts(updatedShifts);
      }
      
      setSelectedShiftIds(new Set());
      setHasChanges(false);
      
      toast.success(`${shiftsToDelete.length}件のシフトを削除しました`);
      
      // データを再読み込み
      if (activeTab === 'daily') {
        await loadData();
      } else {
        await loadPeriodShifts();
      }
    } catch (error) {
      console.error('❌ Error deleting shifts:', error);
      toast.error('シフトの削除に失敗しました');
    }
  }, [selectedShiftIds, shifts, periodShifts, activeTab, loadData, loadPeriodShifts]);

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

  // ルールチェック関数
  const handleRuleCheck = async () => {
    setIsCheckingRules(true);
    try {
      console.log('🔍 [RULE_CHECK] Starting rule check...');
      
      // 現在表示されているシフトをチェック
      const shiftsToCheck = activeTab === 'daily' ? shifts : periodShifts;
      
      if (shiftsToCheck.length === 0) {
        toast.info('チェックするシフトがありません');
        return;
      }
      
      // ルールチェック実行
      const result = await checkShiftRules(shiftsToCheck, selectedLocation !== 'all' ? selectedLocation : undefined);
      
      console.log('✅ [RULE_CHECK] Rule check completed:', result);
      
      setRuleViolations(result.violations);
      setShowRuleCheckDialog(true);
      
      if (result.totalViolations === 0) {
        toast.success('制約違反は見つかりませんでした');
      } else {
        toast.warning(`${result.errorCount}件のエラー、${result.warningCount}件の警告が見つかりました`);
      }
    } catch (error) {
      console.error('❌ [RULE_CHECK] Error during rule check:', error);
      toast.error('ルールチェック中にエラーが発生しました');
    } finally {
      setIsCheckingRules(false);
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
        .eq('location', selectedLocation);

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
  
  // Calculate empty time slots for an employee
  const calculateEmptySlots = (employeeShifts: any[], timeSlots: any[]) => {
    const emptySlots: number[] = [];
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      // timeSlots is an array of {hour: number, label: string}
      const slotStart = slot.hour;
      
      // Check if this slot is covered by any shift bar
      const isCovered = employeeShifts.some(shift => {
        const shiftStartHour = parseInt((shift.start_time || "00:00:00").split(":")[0]);
        const shiftEndHour = parseInt((shift.end_time || "00:00:00").split(":")[0]);
        
        // Handle shifts that span across midnight
        const adjustedShiftEndHour = shiftEndHour < shiftStartHour ? shiftEndHour + 24 : shiftEndHour;
        const adjustedSlotStart = slotStart < 4 ? slotStart + 24 : slotStart;
        
        // Check if slot is within shift time range
        return adjustedSlotStart >= shiftStartHour && adjustedSlotStart < adjustedShiftEndHour;
      });
      
      if (!isCovered) {
        emptySlots.push(i);
      }
    }
    
    return emptySlots;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">シフト管理（マトリクス表示）</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowSpotBusinessDialog(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            スポット業務登録
          </Button>
          <Button onClick={handleRuleCheck} disabled={isCheckingRules} variant="outline">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isCheckingRules ? 'チェック中...' : 'ルールチェック'}
          </Button>
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
          <Button onClick={() => setShowDeleteShiftsModal(true)} size="sm" className="bg-red-500 hover:bg-red-600 text-white">
            <Trash2 className="h-4 w-4 mr-2" />
            シフト削除
          </Button>
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
              <SelectItem value="川越">川越</SelectItem>
              <SelectItem value="東京">東京</SelectItem>
              <SelectItem value="川口">川口</SelectItem>
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
                  <div className="overflow-auto max-h-[calc(100vh-300px)]">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          {selectedLocation === '東京' && (
                            <th className="border p-2 text-left sticky left-0 top-0 bg-gray-100 z-30 whitespace-nowrap">班</th>
                          )}
                          <th className={`border p-2 text-left bg-gray-100 whitespace-nowrap sticky top-0 ${selectedLocation === '東京' ? 'left-[60px] z-20' : 'left-0 z-30'}`}>従業員名</th>
                          {periodEmployeeViewData.dates.map(date => (
                            <th key={date} className="border p-2 text-center min-w-[120px] sticky top-0 bg-gray-100 z-10">{date}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periodEmployeeViewData.employees.map(employee => {
                          const employeeSets = periodEmployeeViewData.employeeMultiDaySets.get(employee) || new Map();
                          const employeeData = allEmployees.find(e => e.name === employee);
                          const team = employeeData?.team || '無し';
                          return (
                            <tr key={employee} className="hover:bg-gray-50">
                              {selectedLocation === '東京' && (
                                <td className={`border p-2 sticky left-0 bg-white z-20 whitespace-nowrap text-center ${
                                  team === 'Galaxy' ? 'text-purple-900 font-bold' : 
                                  team === 'Aube' ? 'text-blue-900 font-bold' : ''
                                }`}>{team}</td>
                              )}
                              <td className={`border p-2 font-medium bg-white z-10 whitespace-nowrap ${selectedLocation === '東京' ? 'sticky left-[60px]' : 'sticky left-0'}`}>{employee}</td>
                              {periodEmployeeViewData.dates.map((date, dateIdx) => {
                                const businesses = periodEmployeeViewData.shiftMap.get(employee)?.get(date) || [];
                                
                                const employeeShift = periodShifts.find(s => s.employee_name === employee);
                                const cellId = `period-cell-${employeeShift?.employee_id || employee.replace(/\s/g, '_')}-${date}`;
                                
                                const multiDayBusiness = businesses.find((b: any) => b.isMultiDay);
                                
                                return (
                                  <td 
                                    key={date} 
                                    className={`border p-2 text-center cursor-pointer hover:bg-purple-50 transition-colors ${
                                      multiDayBusiness ? 'bg-purple-100' : ''
                                    }`}
                                    onClick={() => {
                                      const employeeShift = periodShifts.find(s => s.employee_name === employee);
                                      if (employeeShift) {
                                        // ポップアップアサイン機能を開く
                                        handleAssignPopupOpen(date, employeeShift.employee_id, employee);
                                      }
                                    }}
                                  >
                                    {businesses.length > 0 ? (
                                      <div className="space-y-1">
                                        {businesses.map((business: any, idx: number) => {
                                          const shift = periodShifts.find(s => 
                                            s.employee_name === employee && 
                                            s.date === date && 
                                            s.business_name === business.name
                                          );
                          // 夜行バス業務かどうかを判定（業務マスタの業務タイプで判定）
                          const businessMaster = businessMasters.find(bm => bm.業務名 === business.name);
                          const isOvernightBus = businessMaster?.業務タイプ === '夜行バス（往路）' || businessMaster?.業務タイプ === '夜行バス（復路）';
                          // 背景色を決定
                          let bgColor = 'bg-blue-200'; // デフォルトは青（夜行バス以外）
                          if (shift?.is_spot_business) {
                            bgColor = 'bg-cyan-400'; // スポット業務はシアン
                          } else if (isOvernightBus && team === 'Aube') {
                            bgColor = 'bg-blue-100'; // Aube班の夜行バスは薄い青
                          } else if (isOvernightBus && team === 'Galaxy') {
                            bgColor = 'bg-purple-100'; // Galaxy班の夜行バスは薄い紫
                          } else if (isOvernightBus) {
                            bgColor = 'bg-white'; // 班未設定の夜行バスは白背景
                          }
                                          return (
                                            <div 
                                              key={idx} 
                                              className={`text-xs rounded px-1 py-0.5 cursor-pointer hover:opacity-80 ${bgColor} ${
                                                shift && selectedShiftIds.has(shift.id) ? 'ring-2 ring-orange-500' : ''
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (shift && e.shiftKey) {
                                                  const newSelected = new Set(selectedShiftIds);
                                                  if (newSelected.has(shift.id)) {
                                                    newSelected.delete(shift.id);
                                                  } else {
                                                    newSelected.add(shift.id);
                                                  }
                                                  setSelectedShiftIds(newSelected);
                                                }
                                              }}
                                              onContextMenu={(e) => {
                                                if (shift) {
                                                  handleContextMenu(e, shift.id);
                                                }
                                              }}
                                            >
                                              {business.name}
                                            </div>
                                          );
                                        })}  
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
                           <th className="border p-2 text-left sticky left-0 bg-gray-100 z-10 whitespace-nowrap">業務名</th>
                          {periodBusinessViewData.dates.map(date => (
                            <th key={date} className="border p-2 text-center min-w-[120px]">{date}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periodBusinessViewData.businesses.map(business => (
                          <tr key={business} className="hover:bg-gray-50">
                            <td className="border p-2 font-medium sticky left-0 bg-white z-10 whitespace-nowrap">{business}</td>
                            {periodBusinessViewData.dates.map(date => {
                              const employees = periodBusinessViewData.shiftMap.get(business)?.get(date) || [];
                              return (
                                <td key={date} className="border p-2 text-center">
                                  {employees.length > 0 ? (
                                    <div className="space-y-1">
                                      {employees.map((employee, idx) => {
                                        const shift = periodShifts.find(s => 
                                          s.business_name === business && 
                                          s.date === date && 
                                          s.employee_name === employee
                                        );
                                        return (
                                          <div 
                                            key={idx} 
                                            className={`text-xs rounded px-1 py-0.5 cursor-pointer hover:opacity-80 ${
                                              shift?.is_spot_business ? 'bg-cyan-400' : 'bg-green-100'
                                            } ${
                                              shift && selectedShiftIds.has(shift.id) ? 'ring-2 ring-orange-500' : ''
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (shift && e.shiftKey) {
                                                const newSelected = new Set(selectedShiftIds);
                                                if (newSelected.has(shift.id)) {
                                                  newSelected.delete(shift.id);
                                                } else {
                                                  newSelected.add(shift.id);
                                                }
                                                setSelectedShiftIds(newSelected);
                                              }
                                            }}
                                            onContextMenu={(e) => {
                                              if (shift) {
                                                handleContextMenu(e, shift.id);
                                              }
                                            }}
                                          >
                                            {employee}
                                          </div>
                                        );
                                      })}
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
                  <div className="w-40 p-2 border-r-2 border-gray-300 font-semibold flex items-center whitespace-nowrap">
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
                  .filter(emp => emp.office === selectedLocation)
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
                          {/* Empty Cells - Only render for time slots without shift bars */}
                          {calculateEmptySlots(employeeShifts, timeSlots).map((slotIndex) => (
                            <div
                              key={`empty-${employee.employee_id}-${slotIndex}`}
                              className="absolute top-0 bottom-0 z-30 pointer-events-auto cursor-pointer hover:bg-blue-50 transition-colors border-r border-gray-200"
                              style={{
                                left: `${(slotIndex / timeSlots.length) * 100}%`,
                                width: `${(1 / timeSlots.length) * 100}%`,
                              }}
                              onClick={() => {
                                handleCellClick({
                                  employeeId: employee.employee_id,
                                  employeeName: employee.name,
                                  businessId: null,
                                  businessName: null,
                                  date: selectedDate,
                                  shiftId: undefined,
                                  isEmpty: true,
                                });
                              }}
                            />
                          ))}
                          
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
                                isSelected={selectedShiftIds.has(shift.id) || isCellSelected({
                                  employeeId: shift.employee_id,
                                  businessId: shift.business_master_id,
                                  date: shift.date,
                                })}
                                onClick={(e) => handleCellClick({
                                  employeeId: shift.employee_id,
                                  employeeName: shift.employee_name || employee.name,
                                  businessId: shift.business_master_id,
                                  businessName: shift.business_name,
                                  date: shift.date,
                                  shiftId: shift.id,
                                }, e)}
                                onContextMenu={(e) => handleContextMenu(e, shift.id)}
                                colorScheme='blue'
                                isSpotBusiness={shift.is_spot_business || false}
                                viewMode={dailyViewMode}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                
                {allEmployees.filter(emp => emp.office === selectedLocation).length === 0 && (
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
                  <div className="w-40 p-2 border-r-2 border-gray-300 font-semibold flex items-center whitespace-nowrap">
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
                  // 東京の夜行バスの場合、班ごとに分けて表示
                  const businessGroups: Array<{key: string; name: string; shifts: ShiftData[]}> = [];
                  const processedBusinesses = new Set<string>();
                  
                  shifts.forEach(shift => {
                    const businessName = shift.business_name || '';
                    const isTokyoOvernightBus = shift.location === '東京' && 
                      (businessName.includes('夜行バス') || businessName.includes('往路') || businessName.includes('復路'));
                    
                    if (isTokyoOvernightBus && shift.employee_group) {
                      // 東京の夜行バスで班情報がある場合
                      const groupKey = `${businessName}_${shift.employee_group}`;
                      if (!processedBusinesses.has(groupKey)) {
                        processedBusinesses.add(groupKey);
                        const groupShifts = shifts.filter(s => 
                          s.business_name === businessName && s.employee_group === shift.employee_group
                        );
                        businessGroups.push({
                          key: groupKey,
                          name: `${businessName} (${shift.employee_group}班)`,
                          shifts: groupShifts
                        });
                      }
                    } else {
                      // 通常の業務
                      if (!processedBusinesses.has(businessName)) {
                        processedBusinesses.add(businessName);
                        const businessShifts = shifts.filter(s => s.business_name === businessName);
                        businessGroups.push({
                          key: businessName,
                          name: businessName,
                          shifts: businessShifts
                        });
                      }
                    }
                  });
                  
                  // ソート：点呼業務を一番上に、次にAube班、その次にGalaxy班
                  businessGroups.sort((a, b) => {
                    const aIsRollCall = a.name.includes('点呼');
                    const bIsRollCall = b.name.includes('点呼');
                    if (aIsRollCall && !bIsRollCall) return -1;
                    if (!aIsRollCall && bIsRollCall) return 1;
                    
                    // Aube班をGalaxy班より先に
                    const aIsAube = a.name.includes('Aube班');
                    const bIsAube = b.name.includes('Aube班');
                    const aIsGalaxy = a.name.includes('Galaxy班');
                    const bIsGalaxy = b.name.includes('Galaxy班');
                    
                    if (aIsAube && bIsGalaxy) return -1;
                    if (aIsGalaxy && bIsAube) return 1;
                    
                    return a.name.localeCompare(b.name);
                  });

                  return businessGroups.map((businessGroup) => {
                    const businessShifts = businessGroup.shifts;
                    const business = businessGroup.name;
                    
                    return (
                      <div key={businessGroup.key} className="flex border-b border-gray-200 hover:bg-gray-50">
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
                                key={`${businessGroup.key}-${index}`}
                                className="min-h-[40px] p-1 border-r border-b bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                                onClick={() => {
                                  // 未アサイン業務をクリックした場合、従業員選択ポップアップを表示
                                  if (businessShifts.length === 0) {
                                    handleUnassignedBusinessClick(business, businessGroup.key);
                                  }
                                }}
                              >
                                {/* Empty cell */}
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
                                isSelected={selectedShiftIds.has(shift.id) || isCellSelected({
                                  employeeId: shift.employee_id,
                                  businessId: shift.business_master_id,
                                  date: shift.date,
                                })}
                                onClick={(e) => handleCellClick({
                                  employeeId: shift.employee_id,
                                  employeeName: shift.employee_name,
                                  businessId: shift.business_master_id,
                                  businessName: shift.business_name,
                                  date: shift.date,
                                  shiftId: shift.id,
                                }, e)}
                                onContextMenu={(e) => handleContextMenu(e, shift.id)}
                                colorScheme='green'
                                isSpotBusiness={shift.is_spot_business || false}
                                viewMode={dailyViewMode}
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
  
  {/* Rule Check Dialog */}
  <Dialog open={showRuleCheckDialog} onOpenChange={setShowRuleCheckDialog}>
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          ルールチェック結果
        </DialogTitle>
        <DialogDescription>
          {ruleViolations.length === 0 ? (
            'すべてのシフトが制約条件を満たしています。'
          ) : (
            `${ruleViolations.filter(v => v.severity === 'error').length}件のエラー、${ruleViolations.filter(v => v.severity === 'warning').length}件の警告が見つかりました。`
          )}
        </DialogDescription>
      </DialogHeader>
      
      {ruleViolations.length > 0 && (
        <div className="space-y-4 mt-4">
          {/* エラー一覧 */}
          {ruleViolations.filter(v => v.severity === 'error').length > 0 && (
            <div>
              <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                エラー ({ruleViolations.filter(v => v.severity === 'error').length}件)
              </h3>
              <div className="space-y-2">
                {ruleViolations.filter(v => v.severity === 'error').map((violation, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertDescription>
                      <div className="font-medium">
                        {violation.date} - {violation.employeeName}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold">{violation.description}</span>
                        {violation.details && (
                          <div className="mt-1 text-xs">{violation.details}</div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
          
          {/* 警告一覧 */}
          {ruleViolations.filter(v => v.severity === 'warning').length > 0 && (
            <div>
              <h3 className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                警告 ({ruleViolations.filter(v => v.severity === 'warning').length}件)
              </h3>
              <div className="space-y-2">
                {ruleViolations.filter(v => v.severity === 'warning').map((violation, index) => (
                  <Alert key={index}>
                    <AlertDescription>
                      <div className="font-medium">
                        {violation.date} - {violation.employeeName}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold">{violation.description}</span>
                        {violation.details && (
                          <div className="mt-1 text-xs">{violation.details}</div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {ruleViolations.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-green-600">制約違反はありません</p>
          <p className="text-sm text-gray-500 mt-2">すべてのシフトがルールに準拠しています。</p>
        </div>
      )}
      
      <DialogFooter>
        <Button onClick={() => setShowRuleCheckDialog(false)}>
          閉じる
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  
  {/* Swap Confirm Dialog */}
  <SwapConfirmDialog
    open={isDialogOpen}
    onOpenChange={setIsDialogOpen}
    swapOperation={getSwapOperation()}
    onConfirm={handleSwapConfirm}
    onCancel={handleSwapCancel}
    isLoading={isSwapping}
  />
  
  {/* Spot Business Dialog */}
  <AddSpotBusinessDialog
    open={showSpotBusinessDialog}
    onOpenChange={setShowSpotBusinessDialog}
    selectedDate={spotBusinessDate}
    selectedEmployeeId={spotBusinessEmployeeId}
    selectedEmployeeName={spotBusinessEmployeeName}
    office={selectedLocation}
    onSuccess={() => {
      if (activeTab === 'daily') {
        loadData();
      } else {
        loadPeriodShifts();
      }
    }}
  />
  
  {/* Delete Shifts Modal */}
  <DeleteShiftsModal
    isOpen={showDeleteShiftsModal}
    onClose={() => setShowDeleteShiftsModal(false)}
    onSuccess={() => {
      if (activeTab === 'daily') {
        loadData();
      } else {
        loadPeriodShifts();
      }
    }}
    locations={locations}
    currentLocation={selectedLocation}
  />
  
  {/* Assign Employee Dialog */}
  <AssignEmployeeDialog
    isOpen={showAssignDialog}
    onClose={() => {
      setShowAssignDialog(false);
      setSelectedBusiness(null);
    }}
    businessName={selectedBusiness?.name || ''}
    availableEmployees={availableEmployees}
    onAssign={handleAssignEmployee}
  />

  {/* Context Menu */}
  {contextMenu && (
    <div
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 9999,
      }}
      className="bg-white shadow-lg rounded border border-gray-200 py-1 min-w-[120px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
        onClick={handleDeleteFromContextMenu}
      >
        <span className="text-red-600">削除</span>
        <span className="text-xs text-gray-500">(Delete)</span>
      </button>
    </div>
  )}
  
  {/* ポップアップアサイン機能 */}
  <Dialog open={showAssignPopup} onOpenChange={setShowAssignPopup}>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {assignTarget?.employeeId ? '業務アサイン' : '従業員アサイン'}
        </DialogTitle>
        <DialogDescription>
          {assignTarget?.employeeId 
            ? `${assignTarget.employeeName} - ${assignTarget.date}`
            : `${assignTarget?.businessName} - ${assignTarget?.date}`
          }
        </DialogDescription>
        {assignTarget?.employeeId && (
          <div className="mt-2 text-sm text-gray-600">
            まだ割り当てられていない業務を白で表示しています
          </div>
        )}
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {(() => {
          console.log('🔍 [DEBUG] Popup data:', {
            assignTarget,
            selectedLocation,
            businessMastersCount: businessMasters.length,
            allEmployeesCount: allEmployees.length
          });
          return null;
        })()}
        {assignTarget?.employeeId ? (
          // 従業員が選択されている場合：業務一覧を表示
          (() => {
            const filteredBusinesses = businessMasters.filter(business => business.営業所 === selectedLocation);
            console.log('🔍 [DEBUG] Filtered businesses:', {
              totalBusinesses: businessMasters.length,
              selectedLocation,
              filteredCount: filteredBusinesses.length,
              sampleBusiness: filteredBusinesses[0]
            });
            return filteredBusinesses.map((business) => {
            // 既にアサインされているか確認
            const isAssigned = assignTarget && periodShifts.some(shift => 
              shift.employee_id === assignTarget.employeeId && 
              shift.date === assignTarget.date && 
              shift.business_name === business.業務名
            );
            
            return (
            <Button
              key={business.業務id}
              variant="outline"
              className={`h-auto py-3 px-4 text-left justify-start ${
                isAssigned ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => !isAssigned && handleAssignBusiness(business)}
              disabled={isAssigned}
            >
              <div className="flex flex-col gap-1">
                <div className="font-semibold">
                  {business.業務名}
                  {isAssigned && <span className="ml-2 text-xs text-gray-500">(アサイン済)</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {business.開始時間} - {business.終了時間}
                </div>
              </div>
            </Button>
            );
          });
          })()
        ) : (
          // 業務が選択されている場合：その日にアサインされていない従業員を表示
          allEmployees
            .filter(emp => emp.office === selectedLocation)
            .filter(emp => {
              // その日にアサインされていない従業員をフィルター
              return !periodShifts.some(shift => 
                shift.employee_id === emp.employee_id && 
                shift.date === assignTarget?.date
              );
            })
            .map((emp) => (
              <Button
                key={emp.employee_id}
                variant="outline"
                className="h-auto py-3 px-4 text-left justify-start"
                onClick={() => handleAssignEmployee({ employee_id: emp.employee_id, employee_name: emp.name })}
              >
                <div className="flex flex-col gap-1">
                  <div className="font-semibold">{emp.name}</div>
                  <div className="text-xs text-gray-500">
                    {emp.team || '班なし'}
                  </div>
                </div>
              </Button>
            ))
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowAssignPopup(false)}>
          キャンセル
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  </div>
  );
}

