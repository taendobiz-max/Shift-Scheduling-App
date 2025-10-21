import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Calendar, 
  Users, 
  Building2, 
  Plus, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  CheckCircle,
  Info,
  UserX,
  Home
} from 'lucide-react';
import { VacationManager } from '@/utils/vacationManager';
import { Link } from 'react-router-dom';
import { VacationMaster, VacationFormData } from '@/types/vacation';
import { loadEmployeesFromExcel, EmployeeMaster } from '@/utils/employeeExcelLoader';

interface Employee {
  id: string;
  name: string;
  location: string;
  従業員ID?: string;
  氏名?: string;
  拠点?: string;
}

export default function VacationManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [vacations, setVacations] = useState<VacationMaster[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [editingVacation, setEditingVacation] = useState<VacationMaster | null>(null);

  // フォームデータ
  const [formData, setFormData] = useState<VacationFormData>({
    location: '',
    employee_id: '',
    employee_name: '',
    vacation_date: '',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // 拠点が選択されたら、該当する従業員をフィルタリング
    if (formData.location) {
      const filtered = employees.filter(emp => emp.location === formData.location);
      setFilteredEmployees(filtered);
      // 拠点が変更されたら従業員選択をリセット
      setFormData(prev => ({ ...prev, employee_id: '', employee_name: '' }));
    } else {
      setFilteredEmployees([]);
    }
  }, [formData.location, employees]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 従業員データを読み込み
      const employeeData = await loadEmployeesFromExcel();
      const convertedEmployees: Employee[] = employeeData.map((emp: EmployeeMaster, index) => ({
        id: emp.employee_id || `emp_${index}`,
        name: emp.name || emp.氏名 || '名前不明',
        location: emp.office || emp.拠点 || '',
        従業員ID: emp.employee_id,
        氏名: emp.name || emp.氏名,
        拠点: emp.office || emp.拠点
      }));

      setEmployees(convertedEmployees);

      // 拠点一覧を抽出
      const uniqueLocations = [...new Set(
        convertedEmployees
          .map(emp => emp.location)
          .filter(location => location && location.trim() !== '')
      )];
      
      setLocations(uniqueLocations);

      // 休暇データを読み込み
      await loadVacations();

      setMessage('データを正常に読み込みました。');
      setMessageType('success');
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      setMessage(`データの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVacations = async () => {
    try {
      const vacationData = await VacationManager.getAllVacations();
      setVacations(vacationData);
    } catch (error) {
      console.error('休暇データ読み込みエラー:', error);
      // 休暇データの読み込み失敗は警告レベル（テーブルが存在しない可能性）
      setMessage('休暇データの読み込みに失敗しました。データベースのテーブルが作成されていない可能性があります。');
      setMessageType('error');
    }
  };

  const handleLocationChange = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    const selectedEmployee = filteredEmployees.find(emp => emp.id === employeeId);
    if (selectedEmployee) {
      setFormData(prev => ({
        ...prev,
        employee_id: employeeId,
        employee_name: selectedEmployee.name
      }));
    }
  };

  const handleInputChange = (field: keyof VacationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.location) return '拠点を選択してください。';
    if (!formData.employee_id) return '従業員を選択してください。';
    if (!formData.vacation_date) return '休暇日付を選択してください。';
    if (!formData.reason.trim()) return '休暇理由を入力してください。';
    
    // 日付が過去でないかチェック
    const selectedDate = new Date(formData.vacation_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return '過去の日付は選択できません。';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 重複チェック
      if (!editingVacation) {
        const isDuplicate = await VacationManager.checkDuplicate(formData.employee_id, formData.vacation_date);
        if (isDuplicate) {
          setMessage('同じ従業員の同じ日付の休暇が既に登録されています。');
          setMessageType('error');
          return;
        }
      }

      if (editingVacation) {
        // 更新
        await VacationManager.updateVacation(editingVacation.id, {
          employee_id: formData.employee_id,
          employee_name: formData.employee_name,
          location: formData.location,
          vacation_date: formData.vacation_date,
          reason: formData.reason
        });
        setMessage('休暇データを更新しました。');
      } else {
        // 新規作成
        await VacationManager.createVacation({
          employee_id: formData.employee_id,
          employee_name: formData.employee_name,
          location: formData.location,
          vacation_date: formData.vacation_date,
          reason: formData.reason
        });
        setMessage('休暇データを登録しました。');
      }

      setMessageType('success');
      
      // フォームをリセット
      setFormData({
        location: '',
        employee_id: '',
        employee_name: '',
        vacation_date: '',
        reason: ''
      });
      setEditingVacation(null);
      
      // 休暇データを再読み込み
      await loadVacations();
      
    } catch (error) {
      console.error('休暇登録エラー:', error);
      setMessage(`休暇の${editingVacation ? '更新' : '登録'}に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (vacation: VacationMaster) => {
    setEditingVacation(vacation);
    setFormData({
      location: vacation.location,
      employee_id: vacation.employee_id,
      employee_name: vacation.employee_name,
      vacation_date: vacation.vacation_date,
      reason: vacation.reason
    });
  };

  const handleCancelEdit = () => {
    setEditingVacation(null);
    setFormData({
      location: '',
      employee_id: '',
      employee_name: '',
      vacation_date: '',
      reason: ''
    });
  };

  const handleDelete = async (vacation: VacationMaster) => {
    if (!confirm(`${vacation.employee_name}さんの${vacation.vacation_date}の休暇を削除しますか？`)) {
      return;
    }

    try {
      await VacationManager.deleteVacation(vacation.id);
      setMessage('休暇データを削除しました。');
      setMessageType('success');
      await loadVacations();
    } catch (error) {
      console.error('休暇削除エラー:', error);
      setMessage(`休暇の削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Home Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">休暇管理</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            ホームへ戻る
          </Button>
        </Link>
      </div>
      
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserX className="w-5 h-5 mr-2" />
            休暇管理
          </CardTitle>
        </CardHeader>
      </Card>

      {/* メッセージ表示 */}
      {message && (
        <Alert className={messageType === 'error' ? 'border-red-200 bg-red-50' : messageType === 'success' ? 'border-green-200 bg-green-50' : ''}>
          {messageType === 'error' && <AlertTriangle className="h-4 w-4" />}
          {messageType === 'success' && <CheckCircle className="h-4 w-4" />}
          {messageType === 'info' && <Info className="h-4 w-4" />}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* 休暇登録フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            {editingVacation ? '休暇情報編集' : '休暇登録'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 拠点選択 */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                拠点選択
              </Label>
              <Select value={formData.location} onValueChange={handleLocationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="拠点を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 従業員選択 */}
            <div className="space-y-2">
              <Label htmlFor="employee" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                従業員選択
              </Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={handleEmployeeChange}
                disabled={!formData.location}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.location ? "従業員を選択してください" : "まず拠点を選択してください"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.location && filteredEmployees.length === 0 && (
                <p className="text-sm text-red-600">
                  選択された拠点に従業員がいません。
                </p>
              )}
            </div>

            {/* 休暇日付 */}
            <div className="space-y-2">
              <Label htmlFor="vacationDate" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                休暇日付
              </Label>
              <Input
                id="vacationDate"
                type="date"
                value={formData.vacation_date}
                onChange={(e) => handleInputChange('vacation_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* 休暇理由 */}
            <div className="space-y-2">
              <Label htmlFor="reason">休暇理由</Label>
              <Textarea
                id="reason"
                placeholder="休暇理由を入力してください（例：有給休暇、病気休暇、私用など）"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                rows={3}
              />
            </div>

            {/* ボタン */}
            <div className="flex space-x-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingVacation ? '更新中...' : '登録中...'}
                  </>
                ) : (
                  <>
                    {editingVacation ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingVacation ? '更新' : '登録'}
                  </>
                )}
              </Button>
              {editingVacation && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancelEdit}
                >
                  キャンセル
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 登録済み休暇一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>登録済み休暇一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {vacations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              登録された休暇はありません。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">日付</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">拠点</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">従業員名</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">理由</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {vacations.map((vacation) => (
                    <tr key={vacation.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(vacation.vacation_date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{vacation.location}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {vacation.employee_name}
                        <div className="text-xs text-gray-500">ID: {vacation.employee_id}</div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{vacation.reason}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <div className="flex justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(vacation)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(vacation)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 統計情報 */}
      {vacations.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{vacations.length}</div>
                <div className="text-sm text-gray-600">総休暇登録数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {new Set(vacations.map(v => v.employee_id)).size}
                </div>
                <div className="text-sm text-gray-600">休暇対象従業員数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(vacations.map(v => v.location)).size}
                </div>
                <div className="text-sm text-gray-600">対象拠点数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}