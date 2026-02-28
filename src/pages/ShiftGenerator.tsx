import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, Users, Building2, CheckCircle, ArrowLeft, AlertTriangle, Info, Move, Clock, UserX, RotateCcw, Home, Trash2 } from 'lucide-react';
// ContextMenu replaced with custom implementation
import { supabase } from '@/lib/supabase';
// 本社を拠点選択から除外（2026-01-29）
// import { generateShifts } from '@/utils/shiftGenerator'; // Not used - using API server instead
import { loadEmployeesFromExcel, EmployeeMaster } from '@/utils/employeeExcelLoader';
import { loadBusinessMasterFromSupabase, BusinessMaster } from '@/utils/businessMasterLoader';
import { VacationManager } from '@/utils/vacationManager';
import { ExcludedEmployeesManager } from '@/utils/excludedEmployeesManager';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface ShiftResult {
  date: string;
  businessMaster: string;
  employeeName: string;
  employeeId: string;
  id?: string;
}

interface NonWorkingMember {
  id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  reason?: string;
  source?: 'manual' | 'vacation_master';
}

interface Employee {
  id: string;
  name: string;
  location: string;
  従業員ID?: string;
  氏名?: string;
  拠点?: string;
}

interface GenerationSummary {
  total_businesses: number;
  assigned_businesses: number;
  unassigned_businesses: number;
  total_employees: number;
}

// Custom Context Menu Component
const CustomContextMenu = ({ x, y, onDelete, onClose }: { x: number, y: number, onDelete: () => void, onClose: () => void }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  return (
    <div
      style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        onClick={() => { onDelete(); onClose(); }}
      >
        <Trash2 className="w-4 h-4" />
        削除
      </button>
    </div>
  );
};

// Draggable Employee Component
const DraggableEmployee = ({ shift, children, hasChanges, isPair, onDelete }: { 
  shift: ShiftResult | NonWorkingMember, 
  children: React.ReactNode, 
  hasChanges: boolean,
  isPair: boolean,
  onDelete?: (shiftId: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: shift.id!,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (onDelete) {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, [onDelete]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onContextMenu={handleContextMenu}
        className={`
          ${isDragging ? 'opacity-50' : ''}
          ${hasChanges ? 'ring-2 ring-orange-300' : ''}
          ${isPair ? 'border-l-4 border-purple-400' : ''}
          bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm cursor-move hover:bg-blue-200 transition-colors
        `}
      >
        {children}
      </div>
      {contextMenu && onDelete && (
        <CustomContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => onDelete(shift.id!)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

// Draggable Non-Working Member Component
const DraggableNonWorking = ({ member, children }: { 
  member: NonWorkingMember, 
  children: React.ReactNode 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: member.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // 休暇マスタからのデータかどうかで色を変える
  const isVacationMaster = member.source === 'vacation_master';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        ${isDragging ? 'opacity-50' : ''}
        ${isVacationMaster ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-red-100 text-red-800'}
        px-2 py-1 rounded text-xs cursor-move hover:${isVacationMaster ? 'bg-orange-200' : 'bg-red-200'} transition-colors
      `}
    >
      {children}
    </div>
  );
};

// Droppable Cell Component
const DroppableCell = ({ id, children, isEmpty = false, isNonWorking = false }: { 
  id: string, 
  children: React.ReactNode, 
  isEmpty?: boolean,
  isNonWorking?: boolean 
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[${isNonWorking ? '60px' : '40px'}] 
        ${isOver ? (isNonWorking ? 'bg-red-100 border-red-400' : 'bg-blue-100 border-blue-400') : ''}
        ${isEmpty ? 'border-2 border-dashed border-gray-200 hover:border-gray-300' : ''}
        ${isNonWorking ? 'border-2 border-dashed border-red-200 bg-red-50 hover:border-red-300' : ''}
        rounded p-2 text-center transition-colors
      `}
    >
      {children}
    </div>
  );
};

export default function ShiftGenerator() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessMasters, setBusinessMasters] = useState<BusinessMaster[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generationResult, setGenerationResult] = useState<string>('');
  const [shiftResults, setShiftResults] = useState<ShiftResult[]>([]);
  const [originalShiftResults, setOriginalShiftResults] = useState<ShiftResult[]>([]);
  const [nonWorkingMembers, setNonWorkingMembers] = useState<NonWorkingMember[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [unassignedBusinesses, setUnassignedBusinesses] = useState<string[]>([]);
  const [generationSummary, setGenerationSummary] = useState<GenerationSummary | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftResult | NonWorkingMember | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [panelSearch, setPanelSearch] = useState('');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  // 休暇データを読み込んでNonWorkingMemberに追加
  const loadVacationData = async (dateRange: string[]) => {
    try {
      console.log('🏖️ Loading vacation data for date range:', dateRange);
      
      if (dateRange.length === 0) return;
      
      const startDate = dateRange[0];
      const endDate = dateRange[dateRange.length - 1];
      
      const vacations = await VacationManager.getVacationsByDateRange(startDate, endDate);
      console.log('🏖️ Loaded vacations:', vacations);
      
      // 選択された拠点でフィルタリング
      const filteredVacations = vacations.filter(v => v.location === selectedLocation);
      
      const vacationMembers = VacationManager.convertToNonWorkingMembers(filteredVacations);
      console.log('🏖️ Converted vacation members:', vacationMembers);
      
      setNonWorkingMembers(prev => {
        // 既存の手動追加分は保持し、休暇マスタ分のみ更新
        const manualMembers = prev.filter(nw => nw.source !== 'vacation_master');
        return [...manualMembers, ...vacationMembers];
      });
      
    } catch (error) {
      console.warn('⚠️ Could not load vacation data:', error);
      // 休暇データの読み込み失敗は警告レベル（テーブルが存在しない可能性）
    }
  };

  // Helper function to parse cell ID and extract business name and date
  const parseCellId = (cellId: string): { businessName: string; date: string } | null => {
    console.log('🔍 Parsing cell ID:', cellId);
    
    // Handle non-working cells
    if (cellId.startsWith('non-working-')) {
      const date = cellId.replace('non-working-', '');
      console.log('📝 Non-working cell parsed:', { businessName: 'non-working', date });
      return { businessName: 'non-working', date };
    }
    
    // For business cells, we need to find the last occurrence of '-' followed by a date pattern
    // Date pattern: YYYY-MM-DD
    const datePattern = /(\d{4}-\d{2}-\d{2})$/;
    const match = cellId.match(datePattern);
    
    if (match) {
      const date = match[1];
      const businessName = cellId.substring(0, cellId.lastIndexOf('-' + date));
      console.log('📝 Business cell parsed:', { businessName, date });
      return { businessName, date };
    }
    
    console.warn('⚠️ Could not parse cell ID:', cellId);
    return null;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading data for shift generation...');
      
      // Load employees from Excel data
      const employeeData = await loadEmployeesFromExcel();
      console.log('📊 Loaded employee data:', employeeData);
      
      // Convert employee data to proper format
      const convertedEmployees: Employee[] = employeeData.map((emp: EmployeeMaster, index) => ({
        id: emp.employee_id || `emp_${index}`,
        name: emp.name || emp.氏名 || '名前不明',
        location: emp.office || emp.拠点 || '',
        従業員ID: emp.employee_id,
        氏名: emp.name || emp.氏名,
        拠点: emp.office || emp.拠点
      }));
      
      setEmployees(convertedEmployees);
      console.log('✅ Converted employees:', convertedEmployees);

      // Extract unique locations from employee data
      const uniqueLocations = [...new Set(
        convertedEmployees
          .map(emp => emp.location)
          .filter(location => location && location.trim() !== '')
      )];
      
      console.log('📍 Extracted locations:', uniqueLocations);
      setLocations(uniqueLocations);

      // Load business masters
      try {
        const businessData = await loadBusinessMasterFromSupabase();
        setBusinessMasters(businessData);
        console.log('✅ Loaded business masters:', businessData);
      } catch (businessError) {
        console.warn('⚠️ Could not load business masters from Supabase:', businessError);
        setBusinessMasters([]);
      }

      // If no locations found, add some default options
      if (uniqueLocations.length === 0) {
        console.log('⚠️ No locations found in employee data, adding defaults');
        const defaultLocations = ['川越', '東京', '川口'];
        setLocations(defaultLocations);
      }

      console.log('✅ Data loading completed');
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setGenerationResult(`データの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Set default locations as fallback
      const fallbackLocations = ['川越', '東京', '川口'];
      setLocations(fallbackLocations);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const getPairBusinesses = (businessMasters: BusinessMaster[]) => {
    const pairGroups: { [key: string]: BusinessMaster[] } = {};
    
    businessMasters.forEach(business => {
      const pairId = business.ペア業務ID || business.pair_business_id;
      if (pairId) {
        if (!pairGroups[pairId]) {
          pairGroups[pairId] = [];
        }
        pairGroups[pairId].push(business);
      }
    });
    
    return pairGroups;
  };

  const handleGenerateShifts = async () => {
    if (!selectedLocation || !startDate || !endDate) {
      setGenerationResult('拠点、開始日、終了日を選択してください。');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setGenerationResult('開始日は終了日より前の日付を選択してください。');
      return;
    }

    setIsGenerating(true);
    setGenerationResult('');
    setShiftResults([]);
    setOriginalShiftResults([]);
    setNonWorkingMembers([]);
    setShowResults(false);
    setUnassignedBusinesses([]);
    setGenerationSummary(null);
    setHasChanges(false);

    
    // Check for existing shifts in the date range
    const dateRange = generateDateRange(startDate, endDate);
    const { data: existingShifts, error: checkError } = await supabase
      .from('shifts')
      .select('shift_date')
      .in('shift_date', dateRange);
    
    if (!checkError && existingShifts && existingShifts.length > 0) {
      const existingDates = [...new Set(existingShifts.map((s: any) => s.shift_date))];
      const confirmed = window.confirm(
        `以下の日付に既存のシフトがあります:\n${existingDates.join(', ')}\n\n上書きしてもよろしいですか？`
      );
      
      if (!confirmed) {
        setIsGenerating(false);
        setGenerationResult('シフト生成がキャンセルされました。');
        return;
      }
      
      // Delete existing shifts in the date range
      console.log('🗑️ Deleting existing shifts for dates:', existingDates);
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .in('shift_date', dateRange);
      
      if (deleteError) {
        console.error('❌ Failed to delete existing shifts:', deleteError);
        setGenerationResult(`既存シフトの削除に失敗しました: ${deleteError.message}`);
        setIsGenerating(false);
        return;
      }
      
      console.log('✅ Existing shifts deleted successfully');
    }
    try {
    
      const allShiftResults: ShiftResult[] = [];
      const allUnassignedBusinesses: string[] = [];
      let totalAssigned = 0;
      let totalUnassigned = 0;

      // Filter employees by location
      let filteredEmployees = employees.filter(emp => emp.location === selectedLocation);

      console.log(`👥 Filtered employees for location ${selectedLocation} (before exclusion):`, filteredEmployees);

      // 除外従業員をフィルタリング
      try {
        const excludedIds = await ExcludedEmployeesManager.getExcludedEmployeeIds(selectedLocation);
        console.log(`🚫 Excluded employee IDs for ${selectedLocation}:`, excludedIds);
        
        const beforeCount = filteredEmployees.length;
        filteredEmployees = filteredEmployees.filter(emp => {
          const empId = emp.従業員ID || emp.id;
          return !excludedIds.includes(empId);
        });
        const afterCount = filteredEmployees.length;
        const excludedCount = beforeCount - afterCount;
        
        if (excludedCount > 0) {
          console.log(`✅ Excluded ${excludedCount} employees from shift generation`);
          setGenerationResult(prev => prev + `\n除外従業員: ${excludedCount}名`);
        }
      } catch (error) {
        console.warn('⚠️ Could not load excluded employees:', error);
        // 除外従業員の読み込み失敗は警告レベル（テーブルが存在しない可能性）
      }

      console.log(`👥 Filtered employees for location ${selectedLocation} (after exclusion):`, filteredEmployees);

      if (filteredEmployees.length === 0) {
        setGenerationResult(`選択された拠点「${selectedLocation}」に従業員が見つかりません。従業員管理画面で従業員を登録してください。`);
        setIsGenerating(false);
        return;
      }

      // Filter business masters by location
      const filteredBusinessMasters = businessMasters.filter(bm => bm.営業所 === selectedLocation);

      // Validate business masters data
      if (!filteredBusinessMasters || filteredBusinessMasters.length === 0) {
        setGenerationResult(`選択された拠点「${selectedLocation}」に業務マスタが見つかりません。マスターデータ管理画面で業務マスタを登録してください。`);
        setIsGenerating(false);
        return;
      }

      console.log(`📊 Starting shift generation: ${filteredEmployees.length} employees, ${filteredBusinessMasters.length} businesses, ${dateRange.length} days`);

      // Get pair business groups
      const pairGroups = getPairBusinesses(filteredBusinessMasters);
      console.log('🔗 Pair business groups:', pairGroups);

      // Call API server for shift generation
      console.log('🌐 Calling API server for shift generation');
      console.log('📋 businessMasters being sent:', filteredBusinessMasters);
      console.log('📋 Multi-day businesses:', filteredBusinessMasters.filter((b: any) => (b.運行日数 || b.duration) === 2));
      
      const response = await fetch('/api/generate-shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employees: filteredEmployees,
          businessMasters: filteredBusinessMasters,
          dateRange: dateRange,
          pairGroups: pairGroups,
          location: selectedLocation
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const apiResult = await response.json();
      
      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Shift generation failed');
      }
      
      console.log('✅ API response:', apiResult);
      console.log('✅ API response.success:', apiResult.success);
      console.log('✅ API response.shifts length:', apiResult.shifts?.length);

      // Process API results
      if (apiResult.shifts && apiResult.shifts.length > 0) {
        apiResult.shifts.forEach((shift: any, index: number) => {
          const employee = filteredEmployees.find((emp: any) => 
            emp.id === shift.employee_id || emp.従業員ID === shift.employee_id
          );
          const businessMaster = filteredBusinessMasters.find((bm: any) => 
            bm.id === shift.business_master_id || 
            bm.業務id === shift.business_master_id ||
            bm.業務名 === shift.business_name
          );
          
          // Include shifts even if employee is not assigned (for multi-day shifts)
          const businessName = shift.business_name || businessMaster?.業務名 || businessMaster?.name || shift.business_group || 'Unknown Business';
          
          // Normalize date to YYYY-MM-DD format
          const rawDate = shift.shift_date || shift.date;
          const normalizedDate = typeof rawDate === 'string' && rawDate.includes('T') 
            ? rawDate.split('T')[0] 
            : rawDate;
          
          if (employee) {
            allShiftResults.push({
              id: `shift_${normalizedDate}_${businessName}_${index}`,
              date: normalizedDate,
              businessMaster: businessName,
              employeeName: employee.name,
              employeeId: employee.id,
              multi_day_set_id: shift.multi_day_set_id,
              multi_day_info: shift.multi_day_info
            });
            totalAssigned++;
          } else {
            // Add unassigned shift (e.g., multi-day shifts waiting for assignment)
            allShiftResults.push({
              id: `shift_${normalizedDate}_${businessName}_${index}`,
              date: normalizedDate,
              businessMaster: businessName,
              employeeName: '未割り当て',
              employeeId: '',
              multi_day_set_id: shift.multi_day_set_id,
              multi_day_info: shift.multi_day_info
            });
          }
        });
      }
      
      // Process unassigned businesses
      if (apiResult.unassigned_businesses && apiResult.unassigned_businesses.length > 0) {
        apiResult.unassigned_businesses.forEach((business: string) => {
          if (!allUnassignedBusinesses.includes(business)) {
            allUnassignedBusinesses.push(business);
            totalUnassigned++;
          }
        });
      }
      
      // Also use assignment_summary if available
      if (apiResult.assignment_summary && apiResult.assignment_summary.unassigned_businesses > 0) {
        totalUnassigned = apiResult.assignment_summary.unassigned_businesses;
      }

      console.log('📊 Total shifts to display:', allShiftResults.length);
      console.log('📊 Sample shifts:', allShiftResults.slice(0, 5));
      console.log('📊 Multi-day shifts:', allShiftResults.filter(s => s.multi_day_set_id).length);
      console.log('📊 Unassigned shifts:', allShiftResults.filter(s => s.employeeName === '未割り当て').length);
      
      setShiftResults(allShiftResults);
      setOriginalShiftResults([...allShiftResults]);
      setUnassignedBusinesses(allUnassignedBusinesses);
      setHasChanges(true);
      
      // 休暇データを読み込み
      await loadVacationData(dateRange);
      
      const summary: GenerationSummary = {
        total_businesses: businessMasters.length * dateRange.length,
        assigned_businesses: totalAssigned,
        unassigned_businesses: totalUnassigned,
        total_employees: filteredEmployees.length
      };
      setGenerationSummary(summary);

      if (allShiftResults.length > 0) {
        let message = `シフト生成が完了しました。期間: ${startDate} ～ ${endDate} (${dateRange.length}日間)\n`;
        message += `✅ アサイン成功: ${totalAssigned}件\n`;
        if (totalUnassigned > 0) {
          message += `⚠️ アサイン失敗: ${totalUnassigned}件（制約条件または従業員不足）`;
        }
        setGenerationResult(message);
        setShowResults(true);
      } else {
        // 詳細なエラーメッセージを生成
        let errorMessage = 'シフトを生成できませんでした。\n\n';
        
        // 各日付の結果を確認
        let hasConstraintViolations = false;
        let hasEmployeeShortage = false;
        let violationDetails: string[] = [];
        
        for (const date of dateRange) {
          console.log(`📊 Checking generation result for ${date}`);
          // Note: resultはループ内で生成されるため、ここではアクセスできない
        }
        
        if (allUnassignedBusinesses.length > 0) {
          hasConstraintViolations = true;
          errorMessage += `⚠️ 制約条件を満たす従業員がいません\n`;
          errorMessage += `アサインできなかった業務: ${allUnassignedBusinesses.length}件\n\n`;
        }
        
        if (filteredEmployees.length < businessMasters.length) {
          hasEmployeeShortage = true;
          errorMessage += `⚠️ 従業員不足\n`;
          errorMessage += `従業員数: ${filteredEmployees.length}名 / 業務数: ${businessMasters.length}件\n\n`;
        }
        
        errorMessage += '■ 考えられる原因:\n';
        if (hasConstraintViolations) {
          errorMessage += '1. 必須の制約条件（休息時間、連続勤務日数など）が満たせない\n';
        }
        if (hasEmployeeShortage) {
          errorMessage += '2. 業務数に対して従業員数が不足している\n';
        }
        errorMessage += '3. 点呼対応可能な従業員が不足している\n\n';
        errorMessage += '■ 対応方法:\n';
        errorMessage += '- 従業員管理画面で従業員を追加\n';
        errorMessage += '- 制約条件を緩和（優先度を下げる）\n';
        errorMessage += '- 生成期間を短くする';
        
        setGenerationResult(errorMessage);
      }

    } catch (error) {
      console.error('Shift generation error:', error);
      setGenerationResult(`シフト生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    console.log('🔄 Drag start:', active.id);
    
    // Find the dragged item (either shift or non-working member)
    const activeShift = shiftResults.find(shift => shift.id === active.id);
    const activeNonWorking = nonWorkingMembers.find(nw => nw.id === active.id);
    
    setActiveShift(activeShift || activeNonWorking || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShift(null);

    if (!over) {
      console.log('❌ Drag ended without valid drop target');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log('🔄 Drag end:', { activeId, overId });

    // Parse the target cell ID
    const targetCell = parseCellId(overId);
    if (!targetCell) {
      console.error('❌ Could not parse target cell ID:', overId);
      return;
    }

    const { businessName: targetBusiness, date: targetDate } = targetCell;
    console.log('📝 Parsed target:', { targetBusiness, targetDate });

    // Handle dropping to non-working area
    if (targetBusiness === 'non-working') {
      const activeShift = shiftResults.find(shift => shift.id === activeId);
      
      if (activeShift) {
        console.log('📝 Moving to non-working:', activeShift);
        const newNonWorkingMember: NonWorkingMember = {
          id: `non-working-${Date.now()}`,
          date: targetDate,
          employeeName: activeShift.employeeName,
          employeeId: activeShift.employeeId,
          reason: '希望休',
          source: 'manual'
        };
        
        setNonWorkingMembers(prev => [...prev, newNonWorkingMember]);
        setShiftResults(prev => prev.filter(shift => shift.id !== activeId));
        setHasChanges(true);
        return;
      }
    }

    // Handle moving from non-working back to shift
    if (activeId.startsWith('non-working-') || activeId.startsWith('vacation-')) {
      const activeNonWorking = nonWorkingMembers.find(nw => nw.id === activeId);
      
      if (activeNonWorking && targetBusiness !== 'non-working') {
        // 休暇マスタからのデータは移動不可
        if (activeNonWorking.source === 'vacation_master') {
          console.log('⚠️ Cannot move vacation master data');
          return;
        }
        
        console.log('📝 Moving from non-working to shift:', activeNonWorking);
        
        // Check if target cell is occupied
        const targetShift = shiftResults.find(shift => 
          shift.businessMaster === targetBusiness && shift.date === targetDate
        );

        if (!targetShift) {
          // Move to empty shift cell
          const newShift: ShiftResult = {
            id: `shift_${targetDate}_${targetBusiness}_${Date.now()}`,
            date: targetDate,
            businessMaster: targetBusiness,
            employeeName: activeNonWorking.employeeName,
            employeeId: activeNonWorking.employeeId
          };
          
          setShiftResults(prev => [...prev, newShift]);
          setNonWorkingMembers(prev => prev.filter(nw => nw.id !== activeId));
          setHasChanges(true);
        } else {
          // Swap: move existing shift to non-working
          const newNonWorkingMember: NonWorkingMember = {
            id: `non-working-${targetDate}-${targetShift.employeeId}`,
            date: targetDate,
            employeeName: targetShift.employeeName,
            employeeId: targetShift.employeeId,
            reason: '希望休',
            source: 'manual'
          };
          
          setNonWorkingMembers(prev => [
            ...prev.filter(nw => nw.id !== activeId),
            newNonWorkingMember
          ]);
          
          // Update the existing shift with new employee
          setShiftResults(prev => prev.map(shift => 
            shift.id === targetShift.id 
              ? { ...shift, employeeName: activeNonWorking.employeeName, employeeId: activeNonWorking.employeeId }
              : shift
          ));
          setHasChanges(true);
        }
        return;
      }
    }

    // Handle unassigned employee drag
    if (activeId.startsWith('unassigned-')) {
      // Parse unassigned employee ID: unassigned-{emp.id}-{date}-{idx}
      const parts = activeId.split('-');
      const empId = parts[1];
      const sourceDate = parts[2];
      
      // Find the employee
      const employee = employees.find(emp => 
        emp.id === empId || emp.従業員ID === empId
      );
      
      if (!employee) {
        console.warn('⚠️ Employee not found:', empId);
        return;
      }
      
      console.log('📝 Unassigned employee drag:', { employee, targetBusiness, targetDate });
      
      // Handle dropping to non-working area
      if (targetBusiness === 'non-working') {
        const newNonWorkingMember: NonWorkingMember = {
          id: `non-working-${Date.now()}`,
          date: targetDate,
          employeeName: employee.氏名 || employee.name,
          employeeId: employee.従業員ID || employee.id,
          reason: '希望休',
          source: 'manual'
        };
        
        setNonWorkingMembers(prev => [...prev, newNonWorkingMember]);
        setHasChanges(true);
        return;
      }
      
      // Handle dropping to business cell
      const targetShift = shiftResults.find(shift => 
        shift.businessMaster === targetBusiness && shift.date === targetDate
      );
      
      if (!targetShift) {
        // Move to empty shift cell
        const newShift: ShiftResult = {
          id: `shift_${targetDate}_${targetBusiness}_${Date.now()}`,
          date: targetDate,
          businessMaster: targetBusiness,
          employeeName: employee.氏名 || employee.name,
          employeeId: employee.従業員ID || employee.id
        };
        
        setShiftResults(prev => [...prev, newShift]);
        setHasChanges(true);
      } else {
        // Swap: move existing shift to unassigned (no action needed, just replace)
        setShiftResults(prev => prev.map(shift => 
          shift.id === targetShift.id 
            ? { ...shift, employeeName: employee.氏名 || employee.name, employeeId: employee.従業員ID || employee.id }
            : shift
        ));
        setHasChanges(true);
      }
      return;
    }
    
    // Regular shift drag & drop logic
    const activeShift = shiftResults.find(shift => shift.id === activeId);
    if (!activeShift) {
      console.warn('⚠️ Active shift not found:', activeId);
      return;
    }

    // Check if dropping on the same cell
    if (activeShift.businessMaster === targetBusiness && activeShift.date === targetDate) {
      console.log('⚠️ Dropping on same cell, no action needed');
      return;
    }

    console.log('📝 Regular shift move:', { 
      activeShift: { business: activeShift.businessMaster, date: activeShift.date, employee: activeShift.employeeName }, 
      target: { targetBusiness, targetDate } 
    });

    // Find if there's already a shift in the target cell
    const targetShift = shiftResults.find(shift => 
      shift.businessMaster === targetBusiness && shift.date === targetDate
    );

    const updatedShifts = [...shiftResults];

    if (targetShift) {
      // Swap shifts - exchange business and date assignments
      console.log('🔄 Swapping shifts:', {
        active: { business: activeShift.businessMaster, date: activeShift.date, employee: activeShift.employeeName },
        target: { business: targetShift.businessMaster, date: targetShift.date, employee: targetShift.employeeName }
      });
      
      const activeIndex = updatedShifts.findIndex(shift => shift.id === activeId);
      const targetIndex = updatedShifts.findIndex(shift => shift.id === targetShift.id);

      if (activeIndex !== -1 && targetIndex !== -1) {
        // Store original values
        const activeBusiness = updatedShifts[activeIndex].businessMaster;
        const activeDate = updatedShifts[activeIndex].date;
        const targetBusinessOriginal = updatedShifts[targetIndex].businessMaster;
        const targetDateOriginal = updatedShifts[targetIndex].date;

        // Swap the business and date assignments
        updatedShifts[activeIndex].businessMaster = targetBusinessOriginal;
        updatedShifts[activeIndex].date = targetDateOriginal;
        updatedShifts[targetIndex].businessMaster = activeBusiness;
        updatedShifts[targetIndex].date = activeDate;

        console.log('✅ Swap completed:', {
          activeNow: { business: updatedShifts[activeIndex].businessMaster, date: updatedShifts[activeIndex].date },
          targetNow: { business: updatedShifts[targetIndex].businessMaster, date: updatedShifts[targetIndex].date }
        });
      }
    } else {
      // Move to empty cell
      console.log('📝 Moving to empty cell');
      const activeIndex = updatedShifts.findIndex(shift => shift.id === activeId);
      if (activeIndex !== -1) {
        updatedShifts[activeIndex].businessMaster = targetBusiness;
        updatedShifts[activeIndex].date = targetDate;
        console.log('✅ Move completed:', {
          employee: updatedShifts[activeIndex].employeeName,
          newBusiness: targetBusiness,
          newDate: targetDate
        });
      }
    }

    setShiftResults(updatedShifts);
    setHasChanges(true);
  };

  // Helper function to check if two time ranges overlap
  const timeRangesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const s1 = new Date(`2000-01-01T${start1}`);
    const e1 = new Date(`2000-01-01T${end1}`);
    const s2 = new Date(`2000-01-01T${start2}`);
    const e2 = new Date(`2000-01-01T${end2}`);
    return s1 < e2 && s2 < e1;
  };

  const resetShifts = () => {
    setShiftResults([...originalShiftResults]);
    // 休暇マスタからのデータは保持し、手動追加分のみリセット
    setNonWorkingMembers(prev => prev.filter(nw => nw.source === 'vacation_master'));
    setHasChanges(false);
  };

  const saveShifts = async () => {
    console.log('💾 saveShifts called, shiftResults.length:', shiftResults.length);
    if (shiftResults.length === 0) {
      console.log('⚠️ shiftResults is empty, aborting save');
      return;
    }

    // Check for time conflicts before saving
    const timeConflicts = detectTimeConflicts();
    console.log('⌚ Time conflicts detected:', timeConflicts.length);
    if (timeConflicts.length > 0) {
      const conflictMessages = timeConflicts.map(c => 
        `${c.date}: ${c.employee} → ${c.businesses.join(' ↔ ')}`
      ).join('\n');
      
      const confirmSave = window.confirm(
        `⚠️ 時間重複が検出されました (${timeConflicts.length}件):\n\n${conflictMessages}\n\n※ 同じ従業員が時間重複する業務にアサインされています。\n\nこのまま保存しますか？`
      );
      
      if (!confirmSave) {
        setIsGenerating(false);
        return;
      }
    }

    console.log('✅ No time conflicts, proceeding to save');
    setIsGenerating(true);
    try {
      console.log('📝 Preparing shifts to save...');
      const shiftsToSave = shiftResults.map(result => {
        const business = businessMasters.find(bm => 
          (bm.業務名 || bm.name) === result.businessMaster
        );
        const businessMasterId = business?.業務id || business?.id || result.businessMaster;
        
        return {
          employee_id: result.employeeId,
          business_master_id: businessMasterId,
          business_name: result.businessMaster,
          date: result.date,
          location: selectedLocation,
          created_at: new Date().toISOString(),
          multi_day_set_id: result.multi_day_set_id || null,
          multi_day_info: result.multi_day_info || null
        };
      });

      console.log('💾 Saving', shiftsToSave.length, 'shifts to database...');
      const { error } = await supabase
        .from('shifts')
        .insert(shiftsToSave);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Shifts saved successfully!');
      setGenerationResult('シフトがデータベースに保存されました。');
      setOriginalShiftResults([...shiftResults]);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving shifts:', error);
      setGenerationResult(`シフトの保存中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getBusinessHours = (businessMaster: string) => {
    const business = businessMasters.find(bm => 
      (bm.name || bm.業務名) === businessMaster
    );
    
    if (business && business.開始時間 && business.終了時間) {
      return `${business.開始時間}-${business.終了時間}`;
    }
    
    return '09:00-17:00';
  };

  const isPairBusiness = (businessMaster: string) => {
    const business = businessMasters.find(bm => 
      (bm.name || bm.業務名) === businessMaster
    );
    return business && (business.ペア業務ID || business.pair_business_id);
  };

  const handleDeleteShift = (shiftId: string) => {
    setShiftResults(prev => prev.filter(shift => shift.id !== shiftId));
    setHasChanges(true);
  };

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const renderDraggableCell = (businessMaster: string, date: string, employeeName: string, shift?: ShiftResult) => {
    const cellKey = `${businessMaster}-${date}`;
    const isEmpty = employeeName === '-';

    if (isEmpty) {
      // Empty droppable cell
      return (
        <DroppableCell id={cellKey} isEmpty={true}>
          <span className="text-gray-400">空き</span>
        </DroppableCell>
      );
    }

    // Draggable employee cell
    return (
      <DroppableCell id={cellKey}>
        <DraggableEmployee 
          shift={shift!} 
          hasChanges={hasChanges} 
          isPair={isPairBusiness(businessMaster)}
          onDelete={handleDeleteShift}
        >
          <div className="flex items-center justify-center space-x-1">
            <Move className="w-3 h-3 opacity-50" />
            <span>{employeeName}</span>
          </div>
        </DraggableEmployee>
      </DroppableCell>
    );
  };

  // Calculate unassigned employees for a specific date (filtered by selected location)
  const getUnassignedEmployees = (date: string) => {
    // Get all employees assigned to shifts on this date
    const assignedEmployeeIds = new Set(
      shiftResults
        .filter(shift => shift.date === date)
        .map(shift => shift.employeeId)
    );
    
    // Get employees in non-working list for this date
    const nonWorkingEmployeeIds = new Set(
      nonWorkingMembers
        .filter(nw => nw.date === date)
        .map(nw => nw.employeeId)
    );
    
    // Filter employees who are not assigned and not in non-working list
    // Also filter by selected location
    return employees.filter(emp => {
      const empId = emp.従業員ID || emp.id;
      const empLocation = emp.拠点 || emp.location;
      const matchesLocation = empLocation === selectedLocation;
      return matchesLocation && !assignedEmployeeIds.has(empId) && !nonWorkingEmployeeIds.has(empId);
    });
  };

  const renderNonWorkingCell = (date: string) => {
    const dateNonWorking = nonWorkingMembers.filter(nw => nw.date === date);
    
    return (
      <DroppableCell id={`non-working-${date}`} isNonWorking={true}>
        {dateNonWorking.length === 0 ? (
          <div className="text-center text-red-400 text-xs py-2">
            ドロップして
            <br />
            非出勤に設定
          </div>
        ) : (
          <div className="space-y-1">
            {dateNonWorking.map(nw => (
              <DraggableNonWorking key={nw.id} member={nw}>
                <div className="flex items-center justify-center space-x-1">
                  <Move className="w-3 h-3 opacity-50" />
                  <span title={`${nw.reason}${nw.source === 'vacation_master' ? ' (休暇登録)' : ''}`}>
                    {nw.employeeName}
                    {nw.source === 'vacation_master' && (
                      <span className="ml-1 text-xs">📅</span>
                    )}
                  </span>
                </div>
              </DraggableNonWorking>
            ))}
          </div>
        )}
      </DroppableCell>
    );
  };

  // Detect time conflicts in current shifts
  const detectTimeConflicts = () => {
    console.log('🔍 detectTimeConflicts called');
    const conflicts: { date: string; employee: string; businesses: string[] }[] = [];
    const dates = [...new Set(shiftResults.map(r => r.date))].sort();
    
    dates.forEach(date => {
      const employeeShifts: { [empId: string]: { name: string; shifts: { business: string; start: string; end: string; pairId?: string }[] } } = {};
      
      // Group shifts by employee for this date
      shiftResults
        .filter(shift => shift.date === date)
        .forEach(shift => {
          if (!employeeShifts[shift.employeeId]) {
            employeeShifts[shift.employeeId] = {
              name: shift.employeeName,
              shifts: []
            };
          }
          
          const businessData = businessMasters.find(bm => 
            (bm.name || bm.業務名) === shift.businessMaster
          );
          
          if (businessData) {
            employeeShifts[shift.employeeId].shifts.push({
              business: shift.businessMaster,
              start: businessData.開始時間 || businessData.start_time || '09:00:00',
              end: businessData.終了時間 || businessData.end_time || '17:00:00',
              pairId: businessData.ペア業務ID || businessData.pair_business_id
            });
          }
        });
      
      // Check for conflicts
      Object.entries(employeeShifts).forEach(([empId, data]) => {
        if (data.shifts.length < 2) return;
        
        for (let i = 0; i < data.shifts.length; i++) {
          for (let j = i + 1; j < data.shifts.length; j++) {
            const shift1 = data.shifts[i];
            const shift2 = data.shifts[j];
            
            if (timeRangesOverlap(shift1.start, shift1.end, shift2.start, shift2.end)) {
              conflicts.push({
                date,
                employee: data.name,
                businesses: [shift1.business, shift2.business]
              });
            }
          }
        }
      });
    });
    
    console.log('🔍 detectTimeConflicts result:', conflicts.length, 'conflicts');
    return conflicts;
  };

  const renderShiftMatrix = () => {
    if (shiftResults.length === 0) return null;

    const dates = [...new Set(shiftResults.map(r => r.date))].sort();
    // Only show business masters that are in the shift results (filtered by location)
    const businessMasterNames = [...new Set(shiftResults.map(r => r.businessMaster))]
      .sort((a, b) => {
        // 点呼業務を一番上に表示
        const aIsRollCall = a.includes('点呼');
        const bIsRollCall = b.includes('点呼');
        if (aIsRollCall && !bIsRollCall) return -1;
        if (!aIsRollCall && bIsRollCall) return 1;
        return a.localeCompare(b);
      });

    const matrix: { [key: string]: { [key: string]: { employeeName: string; shift?: ShiftResult } } } = {};
    businessMasterNames.forEach(bm => {
      matrix[bm] = {};
      dates.forEach(date => {
        const result = shiftResults.find(r => r.date === date && r.businessMaster === bm);
        matrix[bm][date] = {
          employeeName: result ? result.employeeName : '-',
          shift: result
        };
      });
    });

    const vacationCount = nonWorkingMembers.filter(nw => nw.source === 'vacation_master').length;
    const timeConflicts = detectTimeConflicts();

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold">シフト生成結果</h3>
              {hasChanges && (
                <div className="flex items-center space-x-2 text-orange-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>変更があります</span>
                </div>
              )}
              {vacationCount > 0 && (
                <div className="flex items-center space-x-2 text-blue-600 text-sm">
                  <UserX className="w-4 h-4" />
                  <span>休暇登録: {vacationCount}件</span>
                </div>
              )}
            </div>
            <div className="space-x-2">
              <Button onClick={() => setShowResults(false)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              {hasChanges && (
                <Button onClick={resetShifts} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  リセット
                </Button>
              )}
              <Button onClick={saveShifts} disabled={isGenerating} className={hasChanges ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}>
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                シフトを保存
              </Button>
            </div>
          </div>

          {hasChanges && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                シフトに変更があります。保存ボタンをクリックして変更を保存してください。
              </AlertDescription>
            </Alert>
          )}

          <Alert className="mb-4">
            <Move className="h-4 w-4" />
            <AlertDescription>
              <strong>ドラッグ&ドロップ操作:</strong> 従業員名をドラッグして他の日付や業務に移動できます。各日付の最下段の非出勤者欄にドロップすると希望休に設定されます。
              <br />
              <strong>右クリック削除:</strong> 従業員名を右クリックすると「削除」メニューが表示されます。削除するとセルが空きになります。
              <br />
              <strong>ペア業務:</strong> 紫色の左線があるセルはペア業務です。同じ従業員にアサインされます。
              <br />
              <strong>休暇登録:</strong> オレンジ色のセルは休暇管理で登録された休暇です（📅アイコン付き）。これらは移動できません。
            </AlertDescription>
          </Alert>

          {generationSummary && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{generationSummary.total_businesses}</div>
                  <div className="text-sm text-gray-600">総業務数</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{generationSummary.assigned_businesses}</div>
                  <div className="text-sm text-gray-600">アサイン成功</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{generationSummary.unassigned_businesses}</div>
                  <div className="text-sm text-gray-600">アサイン失敗</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{generationSummary.total_employees}</div>
                  <div className="text-sm text-gray-600">利用可能従業員</div>
                </CardContent>
              </Card>
            </div>
          )}

          {timeConflicts.length > 0 && (
            <Alert className="mb-6 border-red-500 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="font-semibold mb-2 text-red-800">⚠️ 時間重複が検出されました ({timeConflicts.length}件):</div>
                <div className="max-h-32 overflow-y-auto">
                  {timeConflicts.map((conflict, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {conflict.date}: {conflict.employee} → {conflict.businesses.join(' ↔ ')}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-red-600 mt-2">
                  ※ 同じ従業員が時間重複する業務にアサインされています。ドラッグ&ドロップで修正してください。
                </div>
              </AlertDescription>
            </Alert>
          )}

          {unassignedBusinesses.length > 0 && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">アサインできませんでした ({unassignedBusinesses.length}件):</div>
                <div className="max-h-32 overflow-y-auto">
                  {unassignedBusinesses.map((business, index) => (
                    <div key={index} className="text-sm text-red-600">• {business}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Main content: matrix + floating panel */}
          <div className="flex gap-4 items-start">
          {/* Scrollable table container */}
          <div className="flex-1 min-w-0 border border-gray-300 rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50">
                    <th className="border-b border-r border-gray-300 px-4 py-3 text-left font-medium min-w-[200px] bg-gray-50">
                      業務マスタ
                      <div className="text-xs text-gray-500 mt-1">業務時間</div>
                    </th>
                    {dates.map(date => (
                      <th key={date} className="border-b border-r border-gray-300 px-4 py-3 text-center font-medium min-w-[120px] bg-gray-50">
                        {new Date(date).toLocaleDateString('ja-JP', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {businessMasterNames.map((businessMaster, index) => (
                    <tr key={businessMaster} className="hover:bg-gray-50">
                      <td className="border-b border-r border-gray-300 px-4 py-2 font-medium bg-gray-50">
                        <div className="flex items-center space-x-2">
                          {isPairBusiness(businessMaster) && (
                            <div className="w-1 h-6 bg-purple-400 rounded"></div>
                          )}
                          <div>
                            <div className="font-medium text-sm">{businessMaster}</div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {getBusinessHours(businessMaster)}
                            </div>
                          </div>
                        </div>
                      </td>
                      {dates.map(date => (
                        <td 
                          key={`${businessMaster}-${date}`} 
                          className="border-b border-r border-gray-300 px-2 py-2 text-center"
                        >
                          {renderDraggableCell(
                            businessMaster, 
                            date, 
                            matrix[businessMaster][date].employeeName,
                            matrix[businessMaster][date].shift
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* 休暇登録済み従業員行 */}
                  {nonWorkingMembers.some(nw => nw.source === 'vacation_master') && (
                    <tr className="bg-orange-50">
                      <td className="border-t-2 border-r border-orange-300 px-4 py-2 bg-orange-100">
                        <div className="flex items-center space-x-2">
                          <UserX className="w-4 h-4 text-orange-600" />
                          <div>
                            <div className="font-medium text-sm text-orange-800">📅 休暇登録済み</div>
                            <div className="text-xs text-orange-600">移動不可</div>
                          </div>
                        </div>
                      </td>
                      {dates.map(date => {
                        const vacationMembers = nonWorkingMembers.filter(
                          nw => nw.date === date && nw.source === 'vacation_master'
                        );
                        return (
                          <td key={`vacation-${date}`} className="border-t-2 border-r border-orange-300 px-2 py-2">
                            {vacationMembers.length === 0 ? (
                              <div className="text-center text-orange-300 text-xs py-1">-</div>
                            ) : (
                              <div className="space-y-1">
                                {vacationMembers.map(nw => (
                                  <div
                                    key={nw.id}
                                    className="bg-orange-100 text-orange-800 border border-orange-300 px-2 py-1 rounded text-xs text-center"
                                    title={nw.reason || '休暇'}
                                  >
                                    {nw.employeeName}
                                    {nw.reason && (
                                      <span className="ml-1 text-orange-500">({nw.reason})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating panel: Unassigned employees */}
          <div className={`flex-shrink-0 border border-gray-300 rounded-lg overflow-hidden transition-all duration-200 ${isPanelOpen ? 'w-64' : 'w-10'}`} style={{ position: 'sticky', top: '1rem', maxHeight: '600px' }}>
            {isPanelOpen ? (
              <>
                <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">未アサイン</div>
                      <div className="text-xs text-gray-500">ドラッグでアサイン</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-xs px-1"
                    title="閉じる"
                  >
                    ►
                  </button>
                </div>
                <div className="px-2 py-2 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="名前で検索..."
                    value={panelSearch}
                    onChange={(e) => setPanelSearch(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
                  {dates.map(date => {
                    const unassignedEmps = getUnassignedEmployees(date).filter(emp => {
                      const name = emp.氏名 || emp.name || '';
                      return panelSearch === '' || name.includes(panelSearch);
                    });
                    const isCollapsed = collapsedDates.has(date);
                    const dateLabel = new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
                    return (
                      <div key={`panel-${date}`} className="border-b border-gray-200 last:border-b-0">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700"
                          onClick={() => toggleDateCollapse(date)}
                        >
                          <span>{dateLabel}</span>
                          <span className="flex items-center gap-1">
                            <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs">{unassignedEmps.length}</span>
                            <span>{isCollapsed ? '▼' : '▲'}</span>
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="px-2 py-1 space-y-1">
                            {unassignedEmps.length === 0 ? (
                              <div className="text-xs text-gray-400 text-center py-1">全員アサイン済</div>
                            ) : (
                              unassignedEmps.map((emp, idx) => {
                                const tempShift: ShiftResult = {
                                  id: `unassigned-${emp.id}-${date}-${idx}`,
                                  date: date,
                                  businessMaster: '',
                                  employeeName: emp.氏名 || emp.name,
                                  employeeId: emp.従業員ID || emp.id
                                };
                                return (
                                  <DraggableEmployee
                                    key={tempShift.id}
                                    shift={tempShift}
                                    hasChanges={false}
                                    isPair={false}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <Move className="w-3 h-3 opacity-50" />
                                      <span className="text-xs" title={`従業員ID: ${emp.従業員ID || emp.id}`}>
                                        {emp.氏名 || emp.name}
                                      </span>
                                    </div>
                                  </DraggableEmployee>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsPanelOpen(true)}
                className="w-full h-full flex flex-col items-center justify-center py-4 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                title="未アサイン従業員パネルを開く"
              >
                <Users className="w-4 h-4 mb-1" />
                <span className="text-xs writing-mode-vertical">◄</span>
              </button>
            )}
          </div>
          </div>{/* end flex */}

          {/* Non-working members table (manual only - vacation_master shown in matrix) */}
          {nonWorkingMembers.some(nw => nw.source !== 'vacation_master') && (
            <div className="mt-6 border border-red-300 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-300">
                <div className="flex items-center space-x-2">
                  <UserX className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="font-semibold text-red-800">非出勤者（希望休）</div>
                    <div className="text-xs text-red-600">ドラッグで業務にアサイン可能</div>
                  </div>
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-red-50">
                    <tr>
                      <th className="border-b border-r border-red-200 px-3 py-2 text-left text-sm font-medium">日付</th>
                      <th className="border-b border-red-200 px-3 py-2 text-left text-sm font-medium">従業員</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map(date => {
                      const dateNonWorking = nonWorkingMembers.filter(nw => nw.date === date && nw.source !== 'vacation_master');
                      if (dateNonWorking.length === 0) return null;
                      return (
                        <tr key={`nw-table-${date}`} className="hover:bg-red-25">
                          <td className="border-b border-r border-red-200 px-3 py-2 text-sm align-top">
                            {new Date(date).toLocaleDateString('ja-JP', { 
                              month: 'short', 
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </td>
                          <td className="border-b border-red-200 px-3 py-2">
                            <div className="space-y-1">
                              {dateNonWorking.map(nw => (
                                <DraggableNonWorking key={nw.id} member={nw}>
                                  <div className="flex items-center space-x-1">
                                    <Move className="w-3 h-3 opacity-50" />
                                    <span>{nw.employeeName}</span>
                                  </div>
                                </DraggableNonWorking>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <strong>期間:</strong> {startDate} ～ {endDate} ({dates.length}日間)
              </div>
              <div>
                <strong>拠点:</strong> {selectedLocation}
              </div>
              <div>
                <strong>総アサイン数:</strong> {shiftResults.length}件
              </div>
              <div>
                <strong>非出勤者数:</strong> {nonWorkingMembers.length}名
                {vacationCount > 0 && (
                  <span className="text-blue-600"> (休暇登録: {vacationCount}件)</span>
                )}
              </div>
            </div>
            {unassignedBusinesses.length > 0 && (
              <div className="mt-2 text-red-600">
                <strong>未アサイン数:</strong> {unassignedBusinesses.length}件
              </div>
            )}
            {hasChanges && (
              <div className="mt-2 text-orange-600 font-medium">
                ⚠️ 未保存の変更があります
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeShift ? (
            <div className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm shadow-lg border-2 border-blue-300">
              <div className="flex items-center space-x-1">
                <Move className="w-3 h-3 opacity-50" />
                <span>{'employeeName' in activeShift ? activeShift.employeeName : 'Unknown'}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-lg">データを読込中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              シフト生成結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderShiftMatrix()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Home Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">シフト自動生成</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            ホーム
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            シフト生成
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {employees.length > 0 && businessMasters.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">データ状況:</div>
                <div className="text-sm mt-1">
                  従業員数: {employees.length}名 | 業務マスタ数: {businessMasters.length}件
                  {businessMasters.length > employees.length && (
                    <div className="text-orange-600 mt-1">
                      ⚠️ 業務数が従業員数を上回っています。一部の業務はアサインされない可能性があります。
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              拠点選択
            </Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="拠点を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {locations.filter(location => location !== '本社').map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {locations.length === 0 && (
              <p className="text-sm text-red-600">
                拠点データが見つかりません。従業員データを確認してください。
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <Button 
            onClick={handleGenerateShifts} 
            disabled={isGenerating || !selectedLocation || !startDate || !endDate}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                シフト生成中...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                シフトを生成
              </>
            )}
          </Button>

          {generationResult && (
            <Alert>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm">{generationResult}</pre>
              </AlertDescription>
            </Alert>
          )}

          {selectedLocation && (
            <div className="text-sm text-gray-600 p-4 bg-blue-50 rounded-lg">
              <p><strong>選択された拠点:</strong> {selectedLocation}</p>
              <p><strong>該当従業員数:</strong> {
                employees.filter(emp => emp.location === selectedLocation).length
              }名</p>
              <p><strong>業務マスタ数:</strong> {businessMasters.length}件</p>
              <p><strong>利用可能な拠点:</strong> {locations.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}