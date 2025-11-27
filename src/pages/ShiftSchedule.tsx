import React, { useState, useEffect } from 'react';
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

// Draggable Employee Component
const DraggableEmployee = ({ 
  employeeId, 
  employeeName, 
  shiftId,
  businessName,
  startTime,
  endTime,
  barStyle
}: { 
  employeeId: string; 
  employeeName: string;
  shiftId?: string;
  businessName?: string;
  startTime?: string;
  endTime?: string;
  barStyle?: { left: string; width: string };
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: shiftId || `employee-${employeeId}`,
    data: { employeeId, employeeName, type: 'employee' }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    ...(barStyle ? { left: barStyle.left, width: barStyle.width } : {})
  };

  // If barStyle is provided, render as a shift bar
  if (barStyle && businessName) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="absolute top-2 bottom-2 bg-blue-500 rounded px-2 flex items-center justify-between text-white text-xs font-medium shadow-md hover:bg-blue-600 transition-colors z-20 cursor-grab active:cursor-grabbing"
      >
        <span className="font-semibold">{employeeName}</span>
        <span className="ml-2 truncate">{businessName}</span>
        <span className="ml-2 text-xs opacity-75">
          {startTime?.substring(0, 5)} - {endTime?.substring(0, 5)}
        </span>
      </div>
    );
  }

  // Otherwise, render as a badge
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="inline-block"
    >
      <Badge variant="secondary" className="cursor-grab active:cursor-grabbing">
        {employeeName}
      </Badge>
    </div>
  );
};

// Droppable Cell Component
const DroppableCell = ({ 
  id, 
  children, 
  isEmpty 
}: { 
  id: string; 
  children: React.ReactNode;
  isEmpty?: boolean;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[40px] p-1 border-r border-b
        ${isOver ? 'bg-blue-50' : isEmpty ? 'bg-gray-50' : 'bg-white'}
        ${isEmpty ? 'hover:bg-gray-100' : ''}
        transition-colors
      `}
    >
      {children}
    </div>
  );
};

export default function ShiftSchedule() {
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  const [businessMasters, setBusinessMasters] = useState<BusinessMaster[]>([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState<EmployeeData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Excel export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');  
  // Period view state
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [periodShifts, setPeriodShifts] = useState<ShiftData[]>([]);
  const [activeTab, setActiveTab] = useState('daily');
  const [periodViewMode, setPeriodViewMode] = useState<'employee' | 'business'>('employee');
  const [dailyViewMode, setDailyViewMode] = useState<'employee' | 'business'>('employee');


  const timeSlots = generateTimeSlots();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
    if (!periodStartDate || !periodEndDate) {
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
        
        const enrichedShifts = (shiftsData || []).map(shift => {
          const employee = allEmployees?.find(e => e.employee_id === shift.employee_id);
          const business = businessMasters?.find(b => 
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
        
        const filtered = selectedLocation === 'all' 
          ? enrichedShifts 
          : enrichedShifts.filter(s => s.location === selectedLocation);
        
        setPeriodShifts(filtered);
        toast.success(`${filtered.length}件のシフトを読み込みました`);
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overId = over.id as string;

    console.log('🎯 Drag end:', { 
      active: active.id, 
      over: overId,
      activeData 
    });

    // Parse the drop target
    // Format: "cell-{employeeId}-{hour}"
    if (overId.startsWith('cell-')) {
      const parts = overId.split('-');
      if (parts.length >= 3) {
        const targetEmployeeId = parts.slice(1, -1).join('-');
        const targetHour = parseInt(parts[parts.length - 1]);
        
        console.log('📍 Drop target:', { targetEmployeeId, targetHour });
        
        // Check if dragging from unassigned employees
        if (activeData?.type === 'employee' && !activeData.shiftId) {
          // Dragging unassigned employee to a cell
          const sourceEmployeeId = activeData.employeeId;
          
          if (sourceEmployeeId !== targetEmployeeId) {
            // Swap: move unassigned employee to target, and move target's shift to unassigned
            const targetShift = shifts.find(s => s.employee_id === targetEmployeeId);
            
            if (targetShift) {
              // Update the shift to assign to the source employee
              const updatedShifts = shifts.map(s => {
                if (s.id === targetShift.id) {
                  return {
                    ...s,
                    employee_id: sourceEmployeeId,
                    employee_name: activeData.employeeName,
                  };
                }
                return s;
              });
              
              setShifts(updatedShifts);
              setHasChanges(true);
              toast.success(`${activeData.employeeName}と${targetShift.employee_name}を交換しました`);
            } else {
              toast.info('交換先の従業員にシフトがありません');
            }
          }
        } else if (activeData?.shiftId) {
          // Dragging existing shift to another cell
          const activeShift = shifts.find(s => s.id === activeData.shiftId);
          
          if (activeShift && activeShift.employee_id !== targetEmployeeId) {
            // Swap shifts between two employees
            const targetShift = shifts.find(s => s.employee_id === targetEmployeeId);
            
            if (targetShift) {
              // Swap the two shifts
              const updatedShifts = shifts.map(s => {
                if (s.id === activeShift.id) {
                  return {
                    ...s,
                    employee_id: targetEmployeeId,
                    employee_name: allEmployees.find(e => e.employee_id === targetEmployeeId)?.name,
                  };
                }
                if (s.id === targetShift.id) {
                  return {
                    ...s,
                    employee_id: activeShift.employee_id,
                    employee_name: activeShift.employee_name,
                  };
                }
                return s;
              });
              
              setShifts(updatedShifts);
              setHasChanges(true);
              toast.success('シフトを交換しました');
            } else {
              // Move shift to unassigned employee
              const updatedShifts = shifts.map(s => {
                if (s.id === activeShift.id) {
                  return {
                    ...s,
                    employee_id: targetEmployeeId,
                    employee_name: allEmployees.find(e => e.employee_id === targetEmployeeId)?.name,
                  };
                }
                return s;
              });
              
              setShifts(updatedShifts);
              setHasChanges(true);
              toast.success('シフトを移動しました');
            }
          }
        }
      }
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
                    onChange={(e) => setPeriodStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-end-date">終了日</Label>
                  <Input
                    id="period-end-date"
                    type="date"
                    value={periodEndDate}
                    onChange={(e) => setPeriodEndDate(e.target.value)}
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
                {periodViewMode === 'employee' ? (
                  /* Employee View: Employees x Dates */
                  (() => {
                    const dates = [...new Set(periodShifts.map(s => s.date))].sort();
                    const employeeNames = [...new Set(periodShifts.map(s => s.employee_name))];
                    const employees = employeeNames
                      .map(name => {
                        const shift = periodShifts.find(s => s.employee_name === name);
                        const employee = allEmployees.find(e => e.employee_id === shift?.employee_id);
                        return { name, display_order: employee?.display_order || 9999 };
                      })
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(e => e.name);
                    
                    const shiftMap = new Map();
                    periodShifts.forEach(shift => {
                      if (!shiftMap.has(shift.employee_name)) {
                        shiftMap.set(shift.employee_name, new Map());
                      }
                      const employeeShifts = shiftMap.get(shift.employee_name);
                      if (!employeeShifts.has(shift.date)) {
                        employeeShifts.set(shift.date, []);
                      }
                      employeeShifts.get(shift.date).push(shift.business_name);
                    });

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border p-2 text-left sticky left-0 bg-gray-100 z-10">従業員名</th>
                              {dates.map(date => (
                                <th key={date} className="border p-2 text-center min-w-[120px]">{date}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map(employee => (
                              <tr key={employee} className="hover:bg-gray-50">
                                <td className="border p-2 font-medium sticky left-0 bg-white z-10">{employee}</td>
                                {dates.map(date => {
                                  const businesses = shiftMap.get(employee)?.get(date) || [];
                                  return (
                                    <td key={date} className="border p-2 text-center">
                                      {businesses.length > 0 ? (
                                        <div className="space-y-1">
                                          {businesses.map((business, idx) => (
                                            <div key={idx} className="text-xs bg-blue-100 rounded px-1 py-0.5">
                                              {business}
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
                    );
                  })()
                ) : (
                  /* Business View: Businesses x Dates */
                  (() => {
                    const dates = [...new Set(periodShifts.map(s => s.date))].sort();
                    const businesses = [...new Set(periodShifts.map(s => s.business_name))].sort();
                    
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

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border p-2 text-left sticky left-0 bg-gray-100 z-10">業務名</th>
                              {dates.map(date => (
                                <th key={date} className="border p-2 text-center min-w-[120px]">{date}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {businesses.map(business => (
                              <tr key={business} className="hover:bg-gray-50">
                                <td className="border p-2 font-medium sticky left-0 bg-white z-10">{business}</td>
                                {dates.map(date => {
                                  const employees = shiftMap.get(business)?.get(date) || [];
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
                    );
                  })()
                )}
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                              <DroppableCell
                                key={`${employee.employee_id}-${index}`}
                                id={`cell-${employee.employee_id}-${slot.hour}`}
                                isEmpty={employeeShifts.length === 0}
                              >
                                {/* Empty cell */}
                              </DroppableCell>
                            ))}
                          </div>
                          
                          {/* Shift Bars */}
                          {employeeShifts.map((shift) => {
                            const barStyle = getTimeBarStyle(
                              shift.start_time || '09:00:00',
                              shift.end_time || '17:00:00'
                            );
                            
                            return (
                              <DraggableEmployee
                                key={shift.id}
                                employeeId={shift.employee_id}
                                employeeName={shift.employee_name || employee.name}
                                shiftId={shift.id}
                                businessName={shift.business_name}
                                startTime={shift.start_time}
                                endTime={shift.end_time}
                                barStyle={barStyle}
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
            (() => {
              const businesses = [...new Set(shifts.map(s => s.business_name))].sort();
              
              const shiftMap = new Map();
              shifts.forEach(shift => {
                if (!shiftMap.has(shift.business_name)) {
                  shiftMap.set(shift.business_name, new Map());
                }
                const businessShifts = shiftMap.get(shift.business_name);
                const slotKey = `${shift.start_time}-${shift.end_time}`;
                if (!businessShifts.has(slotKey)) {
                  businessShifts.set(slotKey, []);
                }
                businessShifts.get(slotKey).push(shift.employee_name);
              });

              return (
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
                    {businesses.map((business) => (
                      <div key={business} className="flex border-b border-gray-200 hover:bg-gray-50">
                        <div className="w-40 p-2 border-r-2 border-gray-300 font-medium text-sm">
                          {business}
                        </div>
                        <div className="flex-1 relative">
                          <div className="flex">
                            {timeSlots.map((slot, slotIndex) => {
                              const businessShifts = shiftMap.get(business);
                              const employees = [];
                              if (businessShifts) {
                                businessShifts.forEach((employeeList, slotKey) => {
                                  const [start, end] = slotKey.split('-');
                                  const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
                                  const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
                                  const slotStartMinutes = slot.hour * 60;
                                  const slotEndMinutes = slotStartMinutes + 60;
                                  
                                  if (startMinutes < slotEndMinutes && endMinutes > slotStartMinutes) {
                                    employees.push(...employeeList);
                                  }
                                });
                              }
                              
                              return (
                                <div
                                  key={slotIndex}
                                  className="flex-1 p-1 border-r border-gray-200 min-h-[60px]"
                                >
                                  {employees.length > 0 && (
                                    <div className="space-y-1">
                                      {employees.map((employee, idx) => (
                                        <div key={idx} className="text-xs bg-green-100 rounded px-1 py-0.5">
                                          {employee}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
          
          <DragOverlay>
            {activeId && (
              <Badge variant="secondary" className="cursor-grabbing">
                ドラッグ中...
              </Badge>
            )}
          </DragOverlay>
          </DndContext>
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
              <DraggableEmployee
                key={emp.employee_id}
                employeeId={emp.employee_id}
                employeeName={emp.name}
              />
            ))}
            {unassignedEmployees.length === 0 && (
              <p className="text-gray-500">すべての従業員がアサインされています</p>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
  </div>
  );
}

