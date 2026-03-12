import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  Building2, 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Home, 
  Save, 
  X,
  Users,
  Calendar,
  Briefcase,
  ChevronRight,
  Clock,
  AlertTriangle,
  Shield,
  Target,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { loadEmployeesFromExcel } from '@/utils/employeeExcelLoader';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SpotBusinessMasterManagement } from '@/components/SpotBusinessMasterManagement';
import { OFFICES } from '@/constants';

// Business Group interfaces
interface BusinessGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
  営業所?: string;
  display_order?: number;
}

interface BusinessGroupForm {
  name: string;
  description: string;
  営業所: string;
  display_order: number;
}

// Business Master interfaces (using Japanese column names from actual data)
interface BusinessMaster {
  業務id?: string;
  業務名?: string;           // 例: "ちふれ①朝の送迎業務"
  営業所?: string;           // 例: "川越"
  開始時間?: string;         // 例: "08:00"
  終了時間?: string;         // 例: "17:00"
  業務グループ?: string;     // 業務の分類
  早朝手当?: string;
  深夜手当?: string;
  スキルマップ項目名?: string;
  ペア業務id?: string;
  created_at?: string;
  is_active?: boolean;       // 業務の有効/無効
  display_order?: number;    // 表示順
  [key: string]: unknown;        // その他の日本語カラム
}

interface BusinessMasterForm {
  業務id: string;
  業務名: string;
  営業所: string;
  業務グループ: string;
  開始時間: string;
  終了時間: string;
  早朝手当: string;
  深夜手当: string;
  スキルマップ項目名: string;
  ペア業務id: string;
  業務タイプ: string;
  運行日数: number;
  班ローテーション: boolean;
  班指定: string;
  方向: string;
  display_order: number;
}


export default function MasterDataManagement() {
  // Business Groups state
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [isBusinessGroupLoading, setIsBusinessGroupLoading] = useState(true);
  const [isBusinessGroupEditing, setIsBusinessGroupEditing] = useState(false);
  const [editingBusinessGroupId, setEditingBusinessGroupId] = useState<string | null>(null);
  const [isBusinessGroupModalOpen, setIsBusinessGroupModalOpen] = useState(false);
  const [businessGroupForm, setBusinessGroupForm] = useState<BusinessGroupForm>({
    name: "",
    description: "",
    営業所: "川越",
    display_order: 9999,
  });

  // Business Master state (using Japanese data structure)
  const [businessMasters, setBusinessMasters] = useState<BusinessMaster[]>([]);
  const [isBusinessMasterLoading, setIsBusinessMasterLoading] = useState(true);
  const [isBusinessMasterEditing, setIsBusinessMasterEditing] = useState(false);
  const [editingBusinessMasterId, setEditingBusinessMasterId] = useState<string | null>(null);
  const [isBusinessMasterModalOpen, setIsBusinessMasterModalOpen] = useState(false);
  const [businessMasterForm, setBusinessMasterForm] = useState<BusinessMasterForm>({
    業務id: '',
    業務名: '',
    営業所: '',
    業務グループ: '',
    開始時間: '',
    終了時間: '',
    早朝手当: '',
    深夜手当: '',
    スキルマップ項目名: '',
    ペア業務id: '',
    業務タイプ: 'normal',
    運行日数: 1,
    班ローテーション: false,
    班指定: 'none',
    方向: 'none',
    display_order: 9999,
  });

  // Available locations from employee data
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('business-groups');
  const [officeFilter, setOfficeFilter] = useState<string>('すべて');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  // Calculate work duration from start and end time
  const calculateWorkDuration = (startTime: string, endTime: string): string | null => {
    if (!startTime || !endTime) return null;
    
    try {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      
      // Handle overnight shifts
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return `${diffHours.toFixed(1)}時間`;
    } catch (error) {
      return null;
    }
  };

  // Load all data with proper parent-child relationships
  const loadAllData = async () => {
    await Promise.all([
      loadBusinessGroups(),
      loadBusinessMasters(),
      loadAvailableLocations()
    ]);
  };

  // Load available locations from employee data
  const loadAvailableLocations = async () => {
    try {
      const employeeData = await loadEmployeesFromExcel();
      const locations = [...new Set(
        employeeData
          .map(emp => emp.office || emp.拠点 || '')
          .filter(location => location && location.trim() !== '')
      )];
      
      // Add "全拠点" option
      const allLocations = ['全拠点', ...locations];
      setAvailableLocations(allLocations);
      console.log('✅ Loaded available locations:', allLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
      // Fallback locations
      setAvailableLocations(['全拠点', ...OFFICES]);
    }
  };

  // Business Groups functions
  const loadBusinessGroups = async () => {
    setIsBusinessGroupLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_groups')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setBusinessGroups(data || []);
      console.log('✅ Loaded business groups:', data?.length || 0);
    } catch (error) {
      console.error('Error loading business groups:', error);
      toast.error(`業務グループの読み込みに失敗しました: ${(error as Error).message}`);
    } finally {
      setIsBusinessGroupLoading(false);
    }
  };

  const handleBusinessGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessGroupForm.name) {
      toast.error('業務グループ名は必須です');
      return;
    }

    try {
      if (editingBusinessGroupId) {
        // Update existing business group
        const { error } = await supabase
          .from('business_groups')
          .update(businessGroupForm)
          .eq('id', editingBusinessGroupId);

        if (error) throw error;
        toast.success('業務グループを更新しました');
      } else {
        // Create new business group
        const { error } = await supabase
          .from('business_groups')
          .insert([businessGroupForm]);

        if (error) throw error;
        toast.success('業務グループを作成しました');
      }

      resetBusinessGroupForm();
      await loadBusinessGroups();
      setIsBusinessGroupModalOpen(false);
    } catch (error) {
      console.error('Error saving business group:', error);
      toast.error(`業務グループの保存に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleBusinessGroupEdit = (group: BusinessGroup) => {
    setBusinessGroupForm({
      name: group.name,
      description: group.description,
      営業所: group.営業所 || '川越',
      display_order: group.display_order ?? 9999,
    });
    setEditingBusinessGroupId(group.id);
    setIsBusinessGroupEditing(true);
    setIsBusinessGroupModalOpen(true);
  };

  const handleBusinessGroupAdd = () => {
    setBusinessGroupForm({
      name: '',
      description: '',
      営業所: '川越',
      display_order: 9999,
    });
    setEditingBusinessGroupId(null);
    setIsBusinessGroupEditing(false);
    setIsBusinessGroupModalOpen(true);
  };

  const handleBusinessGroupDelete = async (id: string) => {
    if (!confirm('この業務グループを削除しますか？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('business_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('業務グループを削除しました');
      await loadBusinessGroups();
    } catch (error) {
      console.error('Error deleting business group:', error);
      toast.error(`業務グループの削除に失敗しました: ${(error as Error).message}`);
    }
  };

  const resetBusinessGroupForm = () => {
    setBusinessGroupForm({
      name: '',
      description: '',
      営業所: '川越',
      display_order: 9999,
    });
    setEditingBusinessGroupId(null);
    setIsBusinessGroupEditing(false);
  };

  // Business Master functions (using Japanese column names)
  const loadBusinessMasters = async () => {
    setIsBusinessMasterLoading(true);
    try {
      console.log('🔄 Loading business masters with Japanese column names...');
      
      const { data, error } = await supabase
        .from('business_master')
        .select('*')  // 全ての日本語カラムを取得（有効/無効を問わず）
        .order('display_order', { ascending: true })
        .order('業務id', { ascending: true });

      if (error) {
        console.error('❌ Error loading business masters:', error);
        throw error;
      }

      console.log('✅ Loaded business masters:', data?.length || 0);
      console.log('📋 Sample data structure:', data?.[0]); // データ構造確認用
      
      setBusinessMasters(data || []);
      setConnectionError(null);
      
      if (data && data.length > 0) {
        toast.success(`${data.length}件の業務マスタを読み込みました`);
      }
    } catch (error) {
      console.error('💥 Error in loadBusinessMasters:', error);
      const errorMessage = (error as Error).message || '不明なエラー';
      setConnectionError(`業務マスタ読み込みエラー: ${errorMessage}`);
      toast.error(`業務マスタの読み込みに失敗しました: ${errorMessage}`);
      setBusinessMasters([]); // Set empty array as fallback
    } finally {
      setIsBusinessMasterLoading(false);
    }
  };

  const handleBusinessMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessMasterForm.業務名) {
      toast.error('業務名は必須です');
      return;
    }

    try {
      if (editingBusinessMasterId) {
        // Update existing business master
        const { error } = await supabase
          .from('business_master')
          .update(businessMasterForm)
          .eq('業務id', editingBusinessMasterId);

        if (error) throw error;
        toast.success('業務マスタを更新しました');
      } else {
        // Create new business master
        // Use provided ID or generate a unique business ID
        const newBusinessId = businessMasterForm.業務id || `BIZ${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        const newBusinessMaster = {
          ...businessMasterForm,
          業務id: newBusinessId
        };
        
        const { error } = await supabase
          .from('business_master')
          .insert([newBusinessMaster]);

        if (error) throw error;
        toast.success('業務マスタを作成しました');
      }

      resetBusinessMasterForm();
      await loadBusinessMasters();
      setIsBusinessMasterModalOpen(false);
    } catch (error) {
      console.error('Error saving business master:', error);
      toast.error(`業務マスタの保存に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleBusinessMasterEdit = (master: BusinessMaster) => {
    setBusinessMasterForm({
      業務id: master.業務id || '',
      業務名: master.業務名 || '',
      営業所: master.営業所 || '',
      業務グループ: master.業務グループ || '',
      開始時間: master.開始時間 || '',
      終了時間: master.終了時間 || '',
      早朝手当: master.早朝手当 || '',
      深夜手当: master.深夜手当 || '',
      スキルマップ項目名: master.スキルマップ項目名 || '',
      ペア業務id: master.ペア業務id || '',
      業務タイプ: (master as any).業務タイプ || 'normal',
      運行日数: (master as any).運行日数 || 1,
      班ローテーション: (master as any).班ローテーション || false,
      班指定: (master as any).班指定 || 'none',
      方向: (master as any).方向 || 'none',
      display_order: master.display_order ?? 9999,
    });
    setEditingBusinessMasterId(master.業務id || null);
    setIsBusinessMasterEditing(true);
    setIsBusinessMasterModalOpen(true);
  };

  const handleBusinessMasterAdd = () => {
    setBusinessMasterForm({
      業務id: '',
      業務名: '',
      営業所: '',
      業務グループ: '',
      開始時間: '',
      終了時間: '',
      早朝手当: '',
      深夜手当: '',
      スキルマップ項目名: '',
      ペア業務id: '',
      業務タイプ: 'normal',
      運行日数: 1,
      班ローテーション: false,
      班指定: '',
      方向: '',
      display_order: 9999,
    });
    setEditingBusinessMasterId(null);
    setIsBusinessMasterEditing(false);
    setIsBusinessMasterModalOpen(true);
  };

  const handleBusinessMasterToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('business_master')
        .update({ is_active: isActive })
        .eq('業務id', id);

      if (error) throw error;

      toast.success(`業務マスタを${isActive ? '有効' : '無効'}化しました`);
      await loadBusinessMasters();
    } catch (error) {
      console.error('Error toggling business master active status:', error);
      toast.error(`業務マスタの状態変更に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleBusinessMasterDelete = async (id: string) => {
    if (!confirm('この業務マスタを削除しますか？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('business_master')
        .delete()
        .eq('業務id', id);

      if (error) throw error;

      toast.success('業務マスタを削除しました');
      await loadBusinessMasters();
    } catch (error) {
      console.error('Error deleting business master:', error);
      toast.error(`業務マスタの削除に失敗しました: ${(error as Error).message}`);
    }
  };

  const resetBusinessMasterForm = () => {
    setBusinessMasterForm({
      業務id: '',
      業務名: '',
      営業所: '',
      業務グループ: '',
      開始時間: '',
      終了時間: '',
      早朝手当: '',
      深夜手当: '',
      スキルマップ項目名: '',
      ペア業務id: '',
      業務タイプ: 'normal',
      運行日数: 1,
      班ローテーション: false,
      班指定: 'none',
      方向: 'none',
      display_order: 9999,
    });
    setEditingBusinessMasterId(null);
    setIsBusinessMasterEditing(false);
  };

  // Helper functions

  // Group business masters by business group for hierarchical display
  const getGroupedBusinessMasters = () => {
    const groupMap = new Map<string, BusinessMaster[]>();
    
    businessMasters.forEach(master => {
      const groupName = master.業務グループ || '未分類';
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(master);
    });

    return Array.from(groupMap.entries()).map(([groupName, masters]) => ({
      groupName,
      masters
    }));
  };

  const isLoading = isBusinessGroupLoading || isBusinessMasterLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">マスタデータを読込中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">業務管理</h1>
          <p className="text-muted-foreground mt-2">業務グループ・業務マスタの管理</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAllData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            ホーム
          </Button>
        </div>
      </div>

      {/* Connection Error Alert */}
      {connectionError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">データベース接続エラー</p>
                <p className="text-sm text-red-600 mt-1">{connectionError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              業務グループ数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(businessMasters.map(bm => bm.業務グループ).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Briefcase className="h-4 w-4 mr-2" />
              業務マスタ数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessMasters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              拘束時間業務
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessMasters.filter(m => m.開始時間 && m.終了時間).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Business Groups, Business Masters and Spot Business */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-4 mb-6">
        <div className="w-48">
          <Select value={officeFilter} onValueChange={setOfficeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="すべて">すべて</SelectItem>
              {OFFICES.map((office) => (
                <SelectItem key={office} value={office}>{office}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabsList className="grid grid-cols-3 flex-1 max-w-5xl">
          <TabsTrigger value="business-groups" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            業務グループ
          </TabsTrigger>
          <TabsTrigger value="business-masters" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            業務マスタ
          </TabsTrigger>
          <TabsTrigger value="spot-business" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            スポット業務
          </TabsTrigger>
        </TabsList>
      </div>

        {/* Business Groups Tab */}
        <TabsContent value="business-groups" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>業務グループ一覧</CardTitle>
                  <CardDescription>登録されている業務グループの一覧</CardDescription>
                </div>
                <Button onClick={handleBusinessGroupAdd} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  新規作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isBusinessGroupLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">読み込み中...</p>
                </div>
              ) : businessGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">業務グループが登録されていません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">表示順</TableHead>
                        <TableHead>業務グループ名</TableHead>
                        <TableHead>営業所</TableHead>
                        <TableHead>説明</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businessGroups
                        .filter(group => officeFilter === 'すべて' || group.営業所 === officeFilter)
                        .map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="text-center text-muted-foreground">{group.display_order ?? 9999}</TableCell>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.営業所 || '−'}</TableCell>
                          <TableCell>{group.description || '−'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleBusinessGroupEdit(group)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleBusinessGroupDelete(group.id)} className="border-red-500 text-red-500 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="business-masters" className="space-y-6">
          {/* Business Masters List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>業務マスタ一覧</CardTitle>
                  <CardDescription>
                    {businessMasters.length > 0 
                      ? `${businessMasters.length}件の業務マスタが登録されています`
                      : '業務マスタが登録されていません'
                    }
                  </CardDescription>
                </div>
                <Button onClick={handleBusinessMasterAdd} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  新規作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {businessMasters.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">業務マスタが登録されていません</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    上記のフォームから業務マスタを追加してください
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {businessMasters.filter(master => officeFilter === "すべて" || master.営業所 === officeFilter).map((master) => (
                      <div key={master.業務id} className={`border rounded-lg p-4 ${
                      master.is_active === false ? 'bg-gray-50 opacity-60' : ''
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground bg-gray-100 rounded px-2 py-0.5 font-mono">{master.display_order ?? 9999}</span>
                          <h4 className={`font-medium ${
                            master.is_active === false ? 'text-gray-400' : ''
                          }`}>{master.業務名}</h4>
                          <Badge variant="outline">
                            {master.業務グループ || '未分類'}
                          </Badge>
                          {master.is_active === false && (
                            <Badge variant="destructive">無効</Badge>
                          )}
                          {master.開始時間 && master.終了時間 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {master.開始時間}～{master.終了時間}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 mr-2">
                            <Label htmlFor={`active-${master.業務id}`} className="text-sm">
                              {master.is_active !== false ? '有効' : '無効'}
                            </Label>
                            <Switch
                              id={`active-${master.業務id}`}
                              checked={master.is_active !== false}
                              onCheckedChange={(checked) => handleBusinessMasterToggleActive(master.業務id || '', checked)}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBusinessMasterEdit(master)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBusinessMasterDelete(master.業務id || '')}
                            className="border-red-500 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {master.業務id && (
                          <p><strong>業務ID:</strong> {master.業務id}</p>
                        )}
                        {master.開始時間 && master.終了時間 && (
                          <p><strong>拘束時間:</strong> {calculateWorkDuration(master.開始時間, master.終了時間)}</p>
                        )}

                        {master.早朝手当 === 'true' && (
                          <p><strong>早朝手当:</strong> あり</p>
                        )}
                        {master.深夜手当 === 'true' && (
                          <p><strong>深夜手当:</strong> あり</p>
                        )}
                        {master.ペア業務id && (
                          <p><strong>ペア業務:</strong> {master.ペア業務id}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spot Business Master Tab */}
        <TabsContent value="spot-business" className="space-y-6">
          <SpotBusinessMasterManagement />
        </TabsContent>


      </Tabs>

      {/* Business Group Modal */}
      <Dialog open={isBusinessGroupModalOpen} onOpenChange={setIsBusinessGroupModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isBusinessGroupEditing ? '業務グループを編集' : '新しい業務グループを追加'}
            </DialogTitle>
            <DialogDescription>
              業務グループの情報を入力してください
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBusinessGroupSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">業務グループ名 *</Label>
                <Input
                  id="groupName"
                  value={businessGroupForm.name}
                  onChange={(e) => setBusinessGroupForm({ ...businessGroupForm, name: e.target.value })}
                  placeholder="例: ロジスティード東日本A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office">営業所 *</Label>
                <Select
                  value={businessGroupForm.営業所}
                  onValueChange={(value) => setBusinessGroupForm({ ...businessGroupForm, 営業所: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="営業所を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="川越">川越</SelectItem>
                    <SelectItem value="川口">川口</SelectItem>
                    <SelectItem value="東京">東京</SelectItem>
                    <SelectItem value="本社">本社</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDescription">説明</Label>
              <Textarea
                id="groupDescription"
                value={businessGroupForm.description}
                onChange={(e) => setBusinessGroupForm({ ...businessGroupForm, description: e.target.value })}
                placeholder="業務グループの説明（任意）"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDisplayOrder">表示順 <span className="text-xs text-muted-foreground">(小さい値ほど上に表示、未設定は9999)</span></Label>
              <Input
                id="groupDisplayOrder"
                type="number"
                min="1"
                value={businessGroupForm.display_order}
                onChange={(e) => setBusinessGroupForm({ ...businessGroupForm, display_order: parseInt(e.target.value) || 9999 })}
                placeholder="例: 10"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBusinessGroupModalOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">{isBusinessGroupEditing ? '更新' : '追加'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Business Master Modal */}
      <Dialog open={isBusinessMasterModalOpen} onOpenChange={setIsBusinessMasterModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isBusinessMasterEditing ? '業務マスタを編集' : '新しい業務マスタを追加'}
            </DialogTitle>
            <DialogDescription>
              業務の詳細情報（拘束時間等）を入力してください
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBusinessMasterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="業務id">業務ID</Label>
                <Input
                  id="業務id"
                  value={businessMasterForm.業務id}
                  onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 業務id: e.target.value })}
                  placeholder="例: B001（空欄の場合は自動生成）"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="業務名">業務名 *</Label>
                <Input
                  id="業務名"
                  value={businessMasterForm.業務名}
                  onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 業務名: e.target.value })}
                  placeholder="例: ちふれ①朝の送迎業務"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="営業所">営業所 *</Label>
                <Select
                  value={businessMasterForm.営業所}
                  onValueChange={(value) => {
                    setBusinessMasterForm({ ...businessMasterForm, 営業所: value, 業務グループ: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="営業所を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="川越">川越</SelectItem>
                    <SelectItem value="川口">川口</SelectItem>
                    <SelectItem value="東京">東京</SelectItem>
                    <SelectItem value="本社">本社</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="業務グループ">業務グループ *</Label>
                <Select
                  value={businessMasterForm.業務グループ}
                  onValueChange={(value) => setBusinessMasterForm({ ...businessMasterForm, 業務グループ: value })}
                  disabled={!businessMasterForm.営業所}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      businessMasterForm.営業所 
                        ? "業務グループを選択" 
                        : "まず営業所を選択してください"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {businessGroups
                      .filter(bg => bg.営業所 === businessMasterForm.営業所)
                      .map(bg => (
                        <SelectItem key={bg.id} value={bg.name}>{bg.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="開始時間">開始時間</Label>
                <Input
                  id="開始時間"
                  type="time"
                  value={businessMasterForm.開始時間}
                  onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 開始時間: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="終了時間">終了時間</Label>
                <Input
                  id="終了時間"
                  type="time"
                  value={businessMasterForm.終了時間}
                  onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 終了時間: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="早朝手当"
                  checked={businessMasterForm.早朝手当 === 'true'}
                  onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 早朝手当: e.target.checked ? 'true' : '' })}
                  className="h-4 w-4"
                />
                <Label htmlFor="早朝手当" className="cursor-pointer">早朝手当</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="深夜手当"
                  checked={businessMasterForm.深夜手当 === 'true'}
                  onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 深夜手当: e.target.checked ? 'true' : '' })}
                  className="h-4 w-4"
                />
                <Label htmlFor="深夜手当" className="cursor-pointer">深夜手当</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ペア業務id">ペア業務ID</Label>
              <Input
                id="ペア業務id"
                value={businessMasterForm.ペア業務id}
                onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, ペア業務id: e.target.value })}
                placeholder="例: TKS_PAIR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">表示順 <span className="text-xs text-muted-foreground">(小さい値ほど上に表示、未設定は9999)</span></Label>
              <Input
                id="displayOrder"
                type="number"
                min="1"
                value={businessMasterForm.display_order}
                onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, display_order: parseInt(e.target.value) || 9999 })}
                placeholder="例: 10"
              />
            </div>
            
            {/* 夜行バス関連フィールド */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3">夜行バス設定（該当する場合のみ）</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="業務タイプ">業務タイプ</Label>
                  <Select
                    value={businessMasterForm.業務タイプ}
                    onValueChange={(value) => {
                      const updates: Partial<BusinessMasterForm> = { 業務タイプ: value };
                      if (value === 'normal') {
                        updates.運行日数 = 1;
                        updates.班ローテーション = false;
                        updates.方向 = 'none';
                      } else {
                        updates.運行日数 = 2;
                        updates.班ローテーション = true;
                      }
                      setBusinessMasterForm({ ...businessMasterForm, ...updates });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">通常業務</SelectItem>
                      <SelectItem value="overnight_outbound">夜行バス（往路）</SelectItem>
                      <SelectItem value="overnight_return">夜行バス（復路）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="運行日数">運行日数</Label>
                  <Input
                    id="運行日数"
                    type="number"
                    min="1"
                    value={businessMasterForm.運行日数}
                    onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 運行日数: parseInt(e.target.value) || 1 })}
                    disabled={businessMasterForm.業務タイプ !== 'normal'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="方向">方向</Label>
                  <Select
                    value={businessMasterForm.方向}
                    onValueChange={(value) => setBusinessMasterForm({ ...businessMasterForm, 方向: value })}
                    disabled={businessMasterForm.業務タイプ === 'normal'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="方向を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">指定なし</SelectItem>
                      <SelectItem value="outbound">往路（東京発）</SelectItem>
                      <SelectItem value="return">復路（現地発）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="班指定">班指定</Label>
                  <Select
                    value={businessMasterForm.班指定}
                    onValueChange={(value) => setBusinessMasterForm({ ...businessMasterForm, 班指定: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="班を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">指定なし</SelectItem>
                      <SelectItem value="Galaxy">Galaxy班</SelectItem>
                      <SelectItem value="Aube">Aube班</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="班ローテーション"
                    checked={businessMasterForm.班ローテーション}
                    onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 班ローテーション: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="班ローテーション" className="cursor-pointer">
                    班ローテーションあり（毎日班が交替）
                  </Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBusinessMasterModalOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {isBusinessMasterEditing ? '更新' : '作成'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
