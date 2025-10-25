import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, RefreshCw, AlertTriangle, Home, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

// Generate time slots from 5:00 to next day 4:59
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = (i + 5) % 24;
    const label = `${hour.toString().padStart(2, '0')}:00`;
    slots.push({ hour, label });
  }
  return slots;
};

// Draggable Employee Component
const DraggableEmployee = ({ 
  employeeId, 
  employeeName, 
  shiftId 
}: { 
  employeeId: string; 
  employeeName: string;
  shiftId?: string;
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
  };

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
        .from('app_9213e72257_employees')
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
        .from('app_9213e72257_business_master')
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
            // Swap with target employee's shift
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
                } else if (s.id === targetShift.id) {
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
              toast.success(`シフトを交換しました`);
            } else {
              // Move shift to target employee (no swap)
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
              toast.success(`シフトを移動しました`);
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
      
      // Delete all existing shifts for this date
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
      const shiftsToSave = shifts.map(shift => ({
        employee_id: shift.employee_id,
        business_master_id: shift.business_master_id,
        date: shift.date,
        location: shift.location || selectedLocation,
        created_at: new Date().toISOString(),
      }));
      
      const { error: insertError } = await supabase
        .from('shifts')
        .insert(shiftsToSave);
      
      if (insertError) {
        console.error('❌ Error inserting shifts:', insertError);
        throw insertError;
      }
      
      console.log('✅ Saved', shiftsToSave.length, 'shifts');
      toast.success('変更を保存しました');
      setHasChanges(false);
      
      // Reload data to get fresh IDs
      await loadData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('保存中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time bar position and width
  const getTimeBarStyle = (startTime: string, endTime: string) => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      // Adjust for 5:00 start time
      let adjustedHours = hours - 5;
      if (adjustedHours < 0) adjustedHours += 24;
      return adjustedHours + minutes / 60;
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    const left = (start / 24) * 100;
    const width = ((end - start) / 24) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              ホーム
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">シフト管理（マトリクス表示）</h1>
        </div>
        {hasChanges && (
          <Button onClick={saveChanges} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            変更を保存
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            フィルター
          </CardTitle>
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

            <div className="space-y-2">
              <Label htmlFor="location">拠点</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="拠点を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadData} disabled={isLoading} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                再読み込み
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            シフトマトリクス - {selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                              <div
                                key={shift.id}
                                className="absolute top-2 bottom-2 bg-blue-500 rounded px-2 flex items-center justify-between text-white text-xs font-medium shadow-md hover:bg-blue-600 transition-colors z-20"
                                style={{
                                  left: barStyle.left,
                                  width: barStyle.width,
                                }}
                              >
                                <DraggableEmployee
                                  employeeId={shift.employee_id}
                                  employeeName={shift.employee_name || employee.name}
                                  shiftId={shift.id}
                                />
                                <span className="ml-2 truncate">{shift.business_name}</span>
                                <span className="ml-2 text-xs opacity-75">
                                  {shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)}
                                </span>
                              </div>
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
    </div>
  );
}

