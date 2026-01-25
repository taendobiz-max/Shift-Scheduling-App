import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function OvertimeRegistration() {
  const [offices, setOffices] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [overtimeHours, setOvertimeHours] = useState('0.0');
  const [overtimeMemo, setOvertimeMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [existingData, setExistingData] = useState<any>(null);

  // 営業所リストを取得
  useEffect(() => {
    const fetchOffices = async () => {
      console.log('Fetching offices...');
      const { data, error } = await supabase
        .from('営業所マスタ')
        .select('営業所')
        .neq('営業所', '本社')
        .order('営業所');
      
      console.log('Offices data:', data);
      console.log('Offices error:', error);
      
      if (data) {
        const officeList = data.map(item => item.営業所);
        console.log('Office list:', officeList);
        setOffices(officeList);
      }
    };
    fetchOffices();
  }, []);

  // 従業員リストを取得
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedOffice) {
        setEmployees([]);
        return;
      }

      const { data, error } = await supabase
        .from('従業員マスタ')
        .select('従業員ID, 氏名')
        .eq('営業所', selectedOffice)
        .order('氏名');
      
      if (data) {
        setEmployees(data);
      }
    };
    fetchEmployees();
  }, [selectedOffice]);

  // 既存の残業時間データを取得
  useEffect(() => {
    const fetchOvertimeData = async () => {
      if (!selectedEmployee || !selectedDate) {
        setExistingData(null);
        setOvertimeHours('0.0');
        setOvertimeMemo('');
        return;
      }

      const { data, error } = await supabase
        .from('manual_overtime')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .eq('date', selectedDate)
        .single();
      
      if (data) {
        setExistingData(data);
        setOvertimeHours(data.overtime_hours.toString());
        setOvertimeMemo(data.memo || '');
      } else {
        setExistingData(null);
        setOvertimeHours('0.0');
        setOvertimeMemo('');
      }
    };
    fetchOvertimeData();
  }, [selectedEmployee, selectedDate]);

  // 残業時間を保存
  const handleSaveOvertime = async () => {
    if (!selectedOffice || !selectedEmployee || !selectedDate) {
      setMessage({ type: 'error', text: '営業所、従業員、日付を選択してください' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const overtimeData = {
        employee_id: selectedEmployee,
        office: selectedOffice,
        date: selectedDate,
        overtime_hours: parseFloat(overtimeHours),
        memo: overtimeMemo || null,
      };

      const { error } = await supabase
        .from('manual_overtime')
        .upsert(overtimeData, {
          onConflict: 'employee_id,date'
        });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: existingData ? '残業時間を更新しました' : '残業時間を登録しました' 
      });

      // データを再取得
      const { data } = await supabase
        .from('manual_overtime')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .eq('date', selectedDate)
        .single();
      
      if (data) {
        setExistingData(data);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `エラー: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 残業時間の選択肢を生成（30分単位、最大6時間）
  const overtimeOptions = [];
  for (let i = 0; i <= 12; i++) {
    overtimeOptions.push((i * 0.5).toFixed(1));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-purple-600" />
              残業時間登録
            </CardTitle>
            <CardDescription>
              管理者用：従業員の残業時間を登録・管理します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 営業所選択 */}
            <div className="space-y-2">
              <Label htmlFor="office">営業所</Label>
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger id="office">
                  <SelectValue placeholder="営業所を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map(office => (
                    <SelectItem key={office} value={office}>
                      {office}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 従業員選択 */}
            <div className="space-y-2">
              <Label htmlFor="employee">従業員</Label>
              <Select 
                value={selectedEmployee} 
                onValueChange={setSelectedEmployee}
                disabled={!selectedOffice}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="従業員を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.従業員ID} value={emp.従業員ID}>
                      {emp.氏名}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 日付選択 */}
            <div className="space-y-2">
              <Label htmlFor="date">日付</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* 残業時間選択 */}
            <div className="space-y-2">
              <Label htmlFor="overtime">残業時間（30分単位、最大6時間）</Label>
              <Select value={overtimeHours} onValueChange={setOvertimeHours}>
                <SelectTrigger id="overtime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {overtimeOptions.map(hours => (
                    <SelectItem key={hours} value={hours}>
                      {hours}時間
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 備考メモ */}
            <div className="space-y-2">
              <Label htmlFor="memo">備考（任意）</Label>
              <Textarea
                id="memo"
                placeholder="備考を入力してください"
                value={overtimeMemo}
                onChange={(e) => setOvertimeMemo(e.target.value)}
                rows={4}
              />
            </div>

            {/* メッセージ表示 */}
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* 登録/更新ボタン */}
            <Button 
              onClick={handleSaveOvertime} 
              disabled={isLoading || !selectedOffice || !selectedEmployee}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? '保存中...' : existingData ? '更新' : '登録'}
            </Button>

            {/* 登録済みデータ表示 */}
            {existingData && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-700">登録済みデータ</p>
                <p className="text-sm text-gray-600">
                  登録済み: <span className="font-semibold">{existingData.overtime_hours}時間</span>
                </p>
                {existingData.memo && (
                  <p className="text-sm text-gray-600">
                    備考: {existingData.memo}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  最終更新: {new Date(existingData.updated_at).toLocaleString('ja-JP')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
