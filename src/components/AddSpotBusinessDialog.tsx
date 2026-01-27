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

interface AddSpotBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  selectedEmployeeId?: string;
  selectedEmployeeName?: string;
  office: string;
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
  
  const [businessName, setBusinessName] = useState('');
  const [date, setDate] = useState(selectedDate || '');
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId || '');
  const [employeeName, setEmployeeName] = useState(selectedEmployeeName || '');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  // Load spot business masters
  useEffect(() => {
    if (open && office) {
      loadSpotMasters();
    }
  }, [open, office]);

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
        .eq('office', office)
        .eq('is_active', true)
        .order('business_name');

      if (error) throw error;
      setSpotMasters(data || []);
    } catch (error) {
      console.error('Error loading spot business masters:', error);
      toast.error('スポット業務マスターの読み込みに失敗しました');
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
    if (!businessName || !date || !employeeId || !departureTime || !returnTime) {
      toast.error('必須項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      const shiftData = {
        employee_id: employeeId,
        business_master_id: 'SPOT',
        business_name: businessName,
        date: date,
        start_time: departureTime,
        end_time: returnTime,
        location: office,
        is_spot_business: true,
        spot_business_master_id: useMaster && selectedMasterId ? selectedMasterId : null,
        memo: memo || null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('shifts')
        .insert([shiftData]);

      if (error) throw error;

      toast.success('スポット業務を登録しました');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error adding spot business:', error);
      toast.error('スポット業務の登録に失敗しました');
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
                <SelectContent>
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

          {/* Employee */}
          <div>
            <Label>従業員 *</Label>
            <Input
              value={employeeName || employeeId}
              disabled
              placeholder="従業員を選択してください"
            />
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
