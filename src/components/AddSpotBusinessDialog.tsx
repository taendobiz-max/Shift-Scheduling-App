import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SpotBusinessMaster {
  id: string;
  business_name: string;
  office: string;
  default_departure_time: string | null;
  default_return_time: string | null;
  memo: string | null;
}

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  office: string;
}

interface AddSpotBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  selectedEmployeeId?: string;
  selectedEmployeeName?: string;
  office?: string;
  onSuccess: () => void;
}

export function AddSpotBusinessDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedEmployeeId,
  selectedEmployeeName,
  office,
  onSuccess
}: AddSpotBusinessDialogProps) {
  const [useMaster, setUseMaster] = useState(false);
  const [spotMasters, setSpotMasters] = useState<SpotBusinessMaster[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>('川越');
  
  const [businessName, setBusinessName] = useState('');
  const [date, setDate] = useState(selectedDate || '');
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId || '');
  const [employeeName, setEmployeeName] = useState(selectedEmployeeName || '');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      console.log('[DEBUG] Dialog opened');
      setBusinessName('');
      setDepartureTime('');
      setReturnTime('');
      setMemo('');
      setUseMaster(false);
      setSelectedMasterId('');
    }
  }, [open]);

  // Load spot business masters and employees
  useEffect(() => {
    if (open) {
      console.log('[DEBUG] Loading data for office:', selectedOffice);
      loadSpotMasters();
      loadEmployees();
    }
  }, [open, selectedOffice]);

  // Update form when selected date/employee changes
  useEffect(() => {
    if (selectedDate) setDate(selectedDate);
    if (selectedEmployeeId) setEmployeeId(selectedEmployeeId);
    if (selectedEmployeeName) setEmployeeName(selectedEmployeeName);
  }, [selectedDate, selectedEmployeeId, selectedEmployeeName]);

  const loadSpotMasters = async () => {
    try {
      const { data, error } = await supabase
        .from('spot_business_master')
        .select('*')
        .eq('office', selectedOffice)
        .eq('is_active', true)
        .order('business_name');

      if (error) throw error;
      setSpotMasters(data || []);
    } catch (error) {
      console.error('Error loading spot business masters:', error);
      toast.error('スポット業務マスターの読み込みに失敗しました');
    }
  };

  const loadEmployees = async () => {
    try {
      console.log('Loading employees for office:', selectedOffice);
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_id, name, office')
        .eq('office', selectedOffice)
        .order('name');

      if (error) throw error;
      console.log('Employees loaded:', data?.length || 0, 'employees');
      console.log('Employee data:', data);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('従業員データの読み込みに失敗しました');
    }
  };

  const handleMasterSelect = (masterId: string) => {
    setSelectedMasterId(masterId);
    const master = spotMasters.find(m => m.id === masterId);
    if (master) {
      setBusinessName(master.business_name);
      setDepartureTime(master.default_departure_time || '');
      setReturnTime(master.default_return_time || '');
      setMemo(master.memo || '');
    }
  };

  const handleSubmit = async () => {
    console.log('[DEBUG] handleSubmit called');
    console.log('[DEBUG] businessName:', businessName);
    console.log('[DEBUG] date:', date);
    console.log('[DEBUG] employeeId:', employeeId);
    console.log('[DEBUG] departureTime:', departureTime);
    console.log('[DEBUG] returnTime:', returnTime);
    console.log('[DEBUG] selectedOffice:', selectedOffice);
    
    if (!businessName || !date || !employeeId || !departureTime || !returnTime) {
      console.log('[DEBUG] Validation failed');
      toast.error('必須項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      // employeeId (UUID) から employee_id (従業員番号) を取得
      const selectedEmployee = employees.find(e => e.id === employeeId);
      if (!selectedEmployee) {
        toast.error('従業員が見つかりません');
        setLoading(false);
        return;
      }
      
      const shiftData = {
        employee_id: selectedEmployee.employee_id,  // 従業員番号を使用
        business_master_id: null,
        business_name: businessName,
        date: date,
        location: selectedOffice,
        is_spot_business: true,
        spot_business_master_id: useMaster && selectedMasterId ? selectedMasterId : null,
        departure_time: departureTime,  // 出庫時間を追加
        return_time: returnTime,  // 帰庫時間を追加
        memo: memo || null,  // memoは別フィールドとして保存
        created_at: new Date().toISOString()
      };

      console.log('[DEBUG] Inserting shift data:', JSON.stringify(shiftData, null, 2));
      const { data, error } = await supabase
        .from('shifts')
        .insert([shiftData])
        .select();

      console.log('[DEBUG] Insert result - data:', JSON.stringify(data, null, 2));
      console.log('[DEBUG] Insert result - error:', error);
      console.log('[DEBUG] Error is null?', error === null);
      console.log('[DEBUG] Data is truthy?', !!data);
      
      if (error) {
        console.log('[DEBUG] Error detected, throwing...');
        throw error;
      }
      
      console.log('[DEBUG] No error, proceeding to success...');

      toast.success('スポット業務を登録しました');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('[DEBUG] Error adding spot business:', error);
      const errorMsg = error?.message || '不明なエラー';
      toast.error('スポット業務の登録に失敗しました: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUseMaster(false);
    setSelectedMasterId('');
    setBusinessName('');
    setDate(selectedDate || '');
    setEmployeeId(selectedEmployeeId || '');
    setEmployeeName(selectedEmployeeName || '');
    setDepartureTime('');
    setReturnTime('');
    setMemo('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>スポット業務登録</DialogTitle>
          <DialogDescription>
            定常的に発生しないスポット業務をシフトに追加します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Master selection toggle */}
          {spotMasters.length > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useMaster"
                checked={useMaster}
                onChange={(e) => {
                  setUseMaster(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedMasterId('');
                    setBusinessName('');
                    setDepartureTime('');
                    setReturnTime('');
                    setMemo('');
                  }
                }}
                className="rounded"
              />
              <Label htmlFor="useMaster">マスターから選択</Label>
            </div>
          )}

          {/* Master selection */}
          {useMaster && (
            <div>
              <Label>スポット業務マスター</Label>
              <Select value={selectedMasterId} onValueChange={handleMasterSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="マスターを選択" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5}>
                  {spotMasters.map((master) => (
                    <SelectItem key={master.id} value={master.id}>
                      {master.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Business name */}
          <div>
            <Label>業務名 *</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="例: ○○病院送迎"
              disabled={useMaster && !!selectedMasterId}
            />
          </div>

          {/* Date */}
          <div>
            <Label>日付 *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Office selection */}
          <div>
            <Label>営業所 *</Label>
            <Select key={`office-${open}`} value={selectedOffice} onValueChange={(value) => {
              console.log('[DEBUG] Office changed to:', value);
              setSelectedOffice(value);
              setEmployeeId('');
              setEmployeeName('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="営業所を選択" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectItem value="川越">川越</SelectItem>
                <SelectItem value="東京">東京</SelectItem>
                <SelectItem value="川口">川口</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee */}
          <div>
            <Label>従業員 *</Label>
            {selectedEmployeeId ? (
              <Input
                value={employeeName || employeeId}
                disabled
                placeholder="従業員を選択してください"
              />
            ) : (
              <Select key={`employee-${open}-${selectedOffice}`} value={employeeId} onValueChange={(value) => {
                console.log('[DEBUG] Employee changed to:', value);
                setEmployeeId(value);  // UUIDを保存
                const emp = employees.find(e => e.id === value);
                if (emp) setEmployeeName(emp.name);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="従業員を選択してください" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5}>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Departure time */}
          <div>
            <Label>出庫時間 *</Label>
            <Input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
            />
          </div>

          {/* Return time */}
          <div>
            <Label>帰庫時間 *</Label>
            <Input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
            />
          </div>

          {/* Memo */}
          <div>
            <Label>備忘メモ</Label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例: 駐車場は裏側"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '登録中...' : '登録'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
