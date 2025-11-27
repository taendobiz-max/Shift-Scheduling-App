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
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { ConstraintManager } from '@/utils/constraintManager';
import { 
  EnhancedConstraint, 
  ConstraintFormData, 
  CONSTRAINT_CATEGORIES, 
  CONSTRAINT_TYPES, 
  ENFORCEMENT_LEVELS,
  PRIORITY_LEVELS
} from '@/types/constraint';
import { loadEmployeesFromExcel } from '@/utils/employeeExcelLoader';
import ConstraintGroupManagement from './ConstraintGroupManagement';

// Business Group interfaces
interface BusinessGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface BusinessGroupForm {
  name: string;
  description: string;
}

// Business Master interfaces (using Japanese column names from actual data)
interface BusinessMaster {
  業務id?: string;
  業務名?: string;           // 例: "ちふれ①朝の送迎業務"
  開始時間?: string;         // 例: "08:00"
  終了時間?: string;         // 例: "17:00"
  業務グループ?: string;     // 業務の分類
  早朝手当?: string;
  深夜手当?: string;
  スキルマップ項目名?: string;
  ペア業務id?: string;
  created_at?: string;
  [key: string]: unknown;        // その他の日本語カラム
}

interface BusinessMasterForm {
  業務名: string;
  業務グループ: string;
  開始時間: string;
  終了時間: string;
  早朝手当: string;
  深夜手当: string;
  スキルマップ項目名: string;
  ペア業務id: string;
}

interface ConstraintStatistics {
  total: number;
  byCategory: Record<string, number>;
  byEnforcement: Record<string, number>;
  byStatus: { active: number; inactive: number };
  byPriority: { mandatory: number; high: number; medium: number; low: number };
}

export default function MasterDataManagement() {
  // Business Groups state
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [isBusinessGroupLoading, setIsBusinessGroupLoading] = useState(true);
  const [isBusinessGroupEditing, setIsBusinessGroupEditing] = useState(false);
  const [editingBusinessGroupId, setEditingBusinessGroupId] = useState<string | null>(null);
  const [businessGroupForm, setBusinessGroupForm] = useState<BusinessGroupForm>({
    name: '',
    description: '',
  });

  // Business Master state (using Japanese data structure)
  const [businessMasters, setBusinessMasters] = useState<BusinessMaster[]>([]);
  const [isBusinessMasterLoading, setIsBusinessMasterLoading] = useState(true);
  const [isBusinessMasterEditing, setIsBusinessMasterEditing] = useState(false);
  const [editingBusinessMasterId, setEditingBusinessMasterId] = useState<string | null>(null);
  const [businessMasterForm, setBusinessMasterForm] = useState<BusinessMasterForm>({
    業務名: '',
    業務グループ: '',
    開始時間: '',
    終了時間: '',
    早朝手当: '',
    深夜手当: '',
    スキルマップ項目名: '',
    ペア業務id: '',
  });

  // Enhanced Constraints state
  const [constraints, setConstraints] = useState<EnhancedConstraint[]>([]);
  const [isConstraintLoading, setIsConstraintLoading] = useState(true);
  const [isConstraintEditing, setIsConstraintEditing] = useState(false);
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null);
  const [constraintForm, setConstraintForm] = useState<ConstraintFormData>({
    constraint_name: '',
    constraint_category: 'その他',
    constraint_value: 0,
    constraint_description: '',
    applicable_locations: [],
    priority_level: PRIORITY_LEVELS.MEDIUM,
    is_active: true,
  });

  // Available locations from employee data
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [constraintStats, setConstraintStats] = useState<ConstraintStatistics | null>(null);
  const [activeTab, setActiveTab] = useState('business-groups');
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
      loadConstraints(),
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
      setAvailableLocations(['全拠点', '川越', '東京', '川口']);
    }
  };

  // Business Groups functions
  const loadBusinessGroups = async () => {
    setIsBusinessGroupLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_groups')
        .select('*')
        .order('created_at', { ascending: false });

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
    } catch (error) {
      console.error('Error saving business group:', error);
      toast.error(`業務グループの保存に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleBusinessGroupEdit = (group: BusinessGroup) => {
    setBusinessGroupForm({
      name: group.name,
      description: group.description,
    });
    setEditingBusinessGroupId(group.id);
    setIsBusinessGroupEditing(true);
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
        .select('*')  // 全ての日本語カラムを取得
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
        toast.success(`${data.length}件の業務マスターを読み込みました`);
      }
    } catch (error) {
      console.error('💥 Error in loadBusinessMasters:', error);
      const errorMessage = (error as Error).message || '不明なエラー';
      setConnectionError(`業務マスター読み込みエラー: ${errorMessage}`);
      toast.error(`業務マスターの読み込みに失敗しました: ${errorMessage}`);
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
        toast.success('業務マスターを更新しました');
      } else {
        // Create new business master
        // Generate a unique business ID
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const newBusinessId = `BIZ${timestamp}${randomSuffix}`;
        
        const newBusinessMaster = {
          ...businessMasterForm,
          業務id: newBusinessId
        };
        
        const { error } = await supabase
          .from('business_master')
          .insert([newBusinessMaster]);

        if (error) throw error;
        toast.success('業務マスターを作成しました');
      }

      resetBusinessMasterForm();
      await loadBusinessMasters();
    } catch (error) {
      console.error('Error saving business master:', error);
      toast.error(`業務マスターの保存に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleBusinessMasterEdit = (master: BusinessMaster) => {
    setBusinessMasterForm({
      業務名: master.業務名 || '',
      業務グループ: master.業務グループ || '',
      開始時間: master.開始時間 || '',
      終了時間: master.終了時間 || '',
      早朝手当: master.早朝手当 || '',
      深夜手当: master.深夜手当 || '',
      スキルマップ項目名: master.スキルマップ項目名 || '',
      ペア業務id: master.ペア業務id || '',
    });
    setEditingBusinessMasterId(master.業務id || null);
    setIsBusinessMasterEditing(true);
  };

  const handleBusinessMasterDelete = async (id: string) => {
    if (!confirm('この業務マスターを削除しますか？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('business_master')
        .delete()
        .eq('業務id', id);

      if (error) throw error;

      toast.success('業務マスターを削除しました');
      await loadBusinessMasters();
    } catch (error) {
      console.error('Error deleting business master:', error);
      toast.error(`業務マスターの削除に失敗しました: ${(error as Error).message}`);
    }
  };

  const resetBusinessMasterForm = () => {
    setBusinessMasterForm({
      業務名: '',
      業務グループ: '',
      開始時間: '',
      終了時間: '',
      早朝手当: '',
      深夜手当: '',
      スキルマップ項目名: '',
      ペア業務id: '',
    });
    setEditingBusinessMasterId(null);
    setIsBusinessMasterEditing(false);
  };

  // Enhanced Constraints functions
  const loadConstraints = async () => {
    setIsConstraintLoading(true);
    try {
      // Check if table exists first
      const tableExists = await ConstraintManager.checkTableExists();
      if (!tableExists) {
        console.log('⚠️ Enhanced constraints table does not exist, creating sample data...');
        // You might want to create sample constraints here
        setConstraints([]);
        setConstraintStats(null);
        return;
      }

      const constraintsData = await ConstraintManager.getAllConstraints();
      setConstraints(constraintsData);
      
      // Load statistics
      const stats = await ConstraintManager.getConstraintStatistics();
      setConstraintStats(stats);
      
      console.log('✅ Loaded enhanced constraints:', constraintsData.length);
      if (constraintsData.length > 0) {
        toast.success(`${constraintsData.length}件の制約条件を読み込みました`);
      }
    } catch (error) {
      console.error('Error loading constraints:', error);
      toast.error(`制約条件の読み込みに失敗しました: ${(error as Error).message}`);
      setConstraints([]);
      setConstraintStats(null);
    } finally {
      setIsConstraintLoading(false);
    }
  };

  const handleConstraintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!constraintForm.constraint_name) {
      toast.error('制約名は必須です');
      return;
    }

    if (constraintForm.applicable_locations.length === 0) {
      toast.error('適用拠点を最低1つ選択してください');
      return;
    }

    try {
      if (editingConstraintId) {
        // Update existing constraint
        await ConstraintManager.updateConstraint(editingConstraintId, constraintForm);
        toast.success('制約条件を更新しました');
      } else {
        // Create new constraint
        await ConstraintManager.createConstraint(constraintForm);
        toast.success('制約条件を作成しました');
      }

      resetConstraintForm();
      await loadConstraints();
    } catch (error) {
      console.error('Error saving constraint:', error);
      toast.error(`制約条件の保存に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleConstraintEdit = (constraint: EnhancedConstraint) => {
    setConstraintForm({
      constraint_name: constraint.constraint_name,
      constraint_category: constraint.constraint_category,
      constraint_value: constraint.constraint_value,
      constraint_description: constraint.constraint_description,
      applicable_locations: constraint.applicable_locations,
      priority_level: constraint.priority_level,
      is_active: constraint.is_active,
    });
    setEditingConstraintId(constraint.id);
    setIsConstraintEditing(true);
  };

  const handleConstraintDelete = async (id: string) => {
    if (!confirm('この制約条件を削除しますか？')) {
      return;
    }

    try {
      await ConstraintManager.deleteConstraint(id);
      toast.success('制約条件を削除しました');
      await loadConstraints();
    } catch (error) {
      console.error('Error deleting constraint:', error);
      toast.error(`制約条件の削除に失敗しました: ${(error as Error).message}`);
    }
  };

  const handleConstraintToggleActive = async (id: string, isActive: boolean) => {
    try {
      await ConstraintManager.toggleConstraintStatus(id, isActive);
      toast.success(`制約条件を${isActive ? '有効' : '無効'}にしました`);
      await loadConstraints();
    } catch (error) {
      console.error('Error toggling constraint:', error);
      toast.error(`制約条件の更新に失敗しました: ${(error as Error).message}`);
    }
  };

  const resetConstraintForm = () => {
    setConstraintForm({
      constraint_name: '',
      constraint_category: 'その他',
      constraint_value: 0,
      constraint_description: '',
      applicable_locations: [],
      priority_level: PRIORITY_LEVELS.MEDIUM,
      is_active: true,
    });
    setEditingConstraintId(null);
    setIsConstraintEditing(false);
  };

  // Helper functions
  const getConstraintTypeLabel = (type: string) => {
    const found = CONSTRAINT_TYPES.find(ct => ct.value === type);
    return found ? found.label : type;
  };

  const getEnforcementLevelInfo = (level: string) => {
    const found = ENFORCEMENT_LEVELS.find(el => el.value === level);
    return found || { value: level, label: level, description: '', color: 'text-gray-600' };
  };

  const getPriorityLevelLabel = (level: number) => {
    if (level === 0) return '必須';
    if (level <= 20) return '高';
    if (level <= 50) return '中';
    return '低';
  };

  const getPriorityLevelColor = (level: number) => {
    if (level === 0) return 'text-red-600 bg-red-50';
    if (level <= 20) return 'text-orange-600 bg-orange-50';
    if (level <= 50) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Handle location checkbox changes
  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setConstraintForm(prev => ({
        ...prev,
        applicable_locations: [...prev.applicable_locations, location]
      }));
    } else {
      setConstraintForm(prev => ({
        ...prev,
        applicable_locations: prev.applicable_locations.filter(loc => loc !== location)
      }));
    }
  };

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

  const isLoading = isBusinessGroupLoading || isBusinessMasterLoading || isConstraintLoading;

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
          <h1 className="text-3xl font-bold">マスタデータ管理</h1>
          <p className="text-muted-foreground mt-2">業務グループ・業務マスター・制約条件の管理</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/'} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            ホーム
          </Button>
          <Button onClick={loadAllData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
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
              業務マスター数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessMasters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              制約条件数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{constraints.length}</div>
            {constraintStats && (
              <div className="text-xs text-muted-foreground mt-1">
                有効: {constraintStats.byStatus?.active || 0}件
              </div>
            )}
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

      {/* Tabs for Business Groups, Business Masters and Enhanced Constraints */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-4xl">
          <TabsTrigger value="business-groups" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            業務グループ
          </TabsTrigger>
          <TabsTrigger value="business-masters" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            業務マスター
          </TabsTrigger>
          <TabsTrigger value="constraints" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            制約条件
          </TabsTrigger>
          <TabsTrigger value="constraint-groups" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            制約グループ
          </TabsTrigger>
        </TabsList>

        {/* Business Groups Tab */}
        <TabsContent value="business-groups" className="space-y-6">
          {/* Business Groups List with Business Masters */}
          <Card>
            <CardHeader>
              <CardTitle>業務グループ一覧（業務マスター別表示）</CardTitle>
              <CardDescription>
                実際の業務データを業務グループ別に表示します
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getGroupedBusinessMasters().length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">業務データが登録されていません</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {getGroupedBusinessMasters().map(({ groupName, masters }) => (
                    <div key={groupName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium text-lg">{groupName}</h4>
                          <Badge variant="outline">
                            {masters.length}件の業務
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Business Masters in this group */}
                      <div className="ml-6 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <ChevronRight className="h-4 w-4" />
                          業務一覧
                        </div>
                        {masters.map((master) => (
                          <div key={master.業務id} className="ml-4 p-3 bg-gray-50 rounded border-l-4 border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">{master.業務名}</span>
                                {master.開始時間 && master.終了時間 && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {master.開始時間}～{master.終了時間}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBusinessMasterEdit(master)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBusinessMasterDelete(master.業務id || '')}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1 ml-6">
                              {master.業務id && (
                                <p><strong>業務ID:</strong> {master.業務id}</p>
                              )}
                              {master.開始時間 && master.終了時間 && (
                                <p><strong>拘束時間:</strong> {calculateWorkDuration(master.開始時間, master.終了時間)}</p>
                              )}
                              {master.スキルマップ項目名 && (
                                <p><strong>スキル:</strong> {master.スキルマップ項目名}</p>
                              )}
                              {master.早朝手当 && (
                                <p><strong>早朝手当:</strong> {master.早朝手当}</p>
                              )}
                              {master.深夜手当 && (
                                <p><strong>深夜手当:</strong> {master.深夜手当}</p>
                              )}
                              {master.ペア業務id && (
                                <p><strong>ペア業務:</strong> {master.ペア業務id}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Masters Tab */}
        <TabsContent value="business-masters" className="space-y-6">
          {/* Add/Edit Business Master Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isBusinessMasterEditing ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {isBusinessMasterEditing ? '業務マスターを編集' : '新しい業務マスターを追加'}
              </CardTitle>
              <CardDescription>
                業務の詳細情報（拘束時間等）を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBusinessMasterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="業務グループ">業務グループ</Label>
                    <Input
                      id="業務グループ"
                      value={businessMasterForm.業務グループ}
                      onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 業務グループ: e.target.value })}
                      placeholder="例: 送迎業務"
                    />
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
                  <div className="space-y-2">
                    <Label htmlFor="早朝手当">早朝手当</Label>
                    <Input
                      id="早朝手当"
                      value={businessMasterForm.早朝手当}
                      onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 早朝手当: e.target.value })}
                      placeholder="例: 500円"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="深夜手当">深夜手当</Label>
                    <Input
                      id="深夜手当"
                      value={businessMasterForm.深夜手当}
                      onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, 深夜手当: e.target.value })}
                      placeholder="例: 1000円"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="スキルマップ項目名">スキルマップ項目名</Label>
                    <Input
                      id="スキルマップ項目名"
                      value={businessMasterForm.スキルマップ項目名}
                      onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, スキルマップ項目名: e.target.value })}
                      placeholder="例: 運転技能"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ペア業務id">ペア業務ID</Label>
                    <Input
                      id="ペア業務id"
                      value={businessMasterForm.ペア業務id}
                      onChange={(e) => setBusinessMasterForm({ ...businessMasterForm, ペア業務id: e.target.value })}
                      placeholder="例: B002"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {isBusinessMasterEditing ? '更新' : '作成'}
                  </Button>
                  {isBusinessMasterEditing && (
                    <Button type="button" variant="outline" onClick={resetBusinessMasterForm}>
                      <X className="h-4 w-4 mr-2" />
                      キャンセル
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Business Masters List */}
          <Card>
            <CardHeader>
              <CardTitle>業務マスター一覧</CardTitle>
              <CardDescription>
                {businessMasters.length > 0 
                  ? `${businessMasters.length}件の業務マスターが登録されています`
                  : '業務マスターが登録されていません'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {businessMasters.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">業務マスターが登録されていません</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    上記のフォームから業務マスターを追加してください
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {businessMasters.map((master) => (
                    <div key={master.業務id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{master.業務名}</h4>
                          <Badge variant="outline">
                            {master.業務グループ || '未分類'}
                          </Badge>
                          {master.開始時間 && master.終了時間 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {master.開始時間}～{master.終了時間}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                        {master.スキルマップ項目名 && (
                          <p><strong>スキル:</strong> {master.スキルマップ項目名}</p>
                        )}
                        {master.早朝手当 && (
                          <p><strong>早朝手当:</strong> {master.早朝手当}</p>
                        )}
                        {master.深夜手当 && (
                          <p><strong>深夜手当:</strong> {master.深夜手当}</p>
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

        {/* Enhanced Constraints Tab */}
        <TabsContent value="constraints" className="space-y-6">
          {/* Constraint Statistics */}
          {constraintStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-red-600" />
                    法令遵守
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{constraintStats.byCategory?.['法令遵守'] || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Target className="h-4 w-4 mr-2 text-blue-600" />
                    その他
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{constraintStats.byCategory?.['その他'] || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    有効制約
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{constraintStats.byStatus?.active || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                    必須制約
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{constraintStats.byPriority?.mandatory || 0}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add/Edit Enhanced Constraint Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isConstraintEditing ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {isConstraintEditing ? '制約条件を編集' : '新しい制約条件を追加'}
              </CardTitle>
              <CardDescription>
                シフト自動生成で使用する制約条件を設定してください。優先度0が最高優先度（必須条件）です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConstraintSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="constraint_name">制約名 *</Label>
                    <Input
                      id="constraint_name"
                      value={constraintForm.constraint_name}
                      onChange={(e) => setConstraintForm({ ...constraintForm, constraint_name: e.target.value })}
                      placeholder="例: 労働基準法 - 最大連続出勤日数"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="constraint_category">制約カテゴリ *</Label>
                    <Select
                      value={constraintForm.constraint_category}
                      onValueChange={(value: '法令遵守' | 'その他') => setConstraintForm({ ...constraintForm, constraint_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSTRAINT_CATEGORIES.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              {category.value === '法令遵守' ? (
                                <Shield className="h-4 w-4 text-red-600" />
                              ) : (
                                <Target className="h-4 w-4 text-blue-600" />
                              )}
                              <div>
                                <div className="font-medium">{category.label}</div>
                                <div className="text-xs text-muted-foreground">{category.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="space-y-2">
                    <Label htmlFor="constraint_value">制約値</Label>
                    <Input
                      id="constraint_value"
                      type="number"
                      min="0"
                      value={constraintForm.constraint_value}
                      onChange={(e) => setConstraintForm({ ...constraintForm, constraint_value: parseInt(e.target.value) || 0 })}
                      placeholder="例: 6"
                    />
                  </div>
                </div>

                {/* Priority Level */}
                <div className="space-y-4">
                  <Label>優先度設定</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">優先度: {constraintForm.priority_level}</span>
                      <Badge className={getPriorityLevelColor(constraintForm.priority_level)}>
                        {getPriorityLevelLabel(constraintForm.priority_level)}
                      </Badge>
                    </div>
                    <Slider
                      value={[constraintForm.priority_level]}
                      onValueChange={(value) => setConstraintForm({ ...constraintForm, priority_level: value[0] })}
                      max={100}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0: 必須</span>
                      <span>50: 中優先度</span>
                      <span>100: 低優先度</span>
                    </div>
                  </div>
                </div>


                {/* Applicable Locations */}
                <div className="space-y-3">
                  <Label>適用拠点 *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {availableLocations.map((location) => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={`location-${location}`}
                          checked={constraintForm.applicable_locations.includes(location)}
                          onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                        />
                        <Label htmlFor={`location-${location}`} className="text-sm">
                          {location}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {constraintForm.applicable_locations.length === 0 && (
                    <p className="text-sm text-red-600">適用拠点を最低1つ選択してください</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="constraint_description">説明</Label>
                  <Textarea
                    id="constraint_description"
                    value={constraintForm.constraint_description}
                    onChange={(e) => setConstraintForm({ ...constraintForm, constraint_description: e.target.value })}
                    placeholder="制約条件の詳細説明を入力してください"
                    rows={3}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={constraintForm.is_active}
                    onCheckedChange={(checked) => setConstraintForm({ ...constraintForm, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    {constraintForm.is_active ? '有効' : '無効'}
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {isConstraintEditing ? '更新' : '作成'}
                  </Button>
                  {isConstraintEditing && (
                    <Button type="button" variant="outline" onClick={resetConstraintForm}>
                      <X className="h-4 w-4 mr-2" />
                      キャンセル
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Enhanced Constraints List */}
          <Card>
            <CardHeader>
              <CardTitle>制約条件一覧</CardTitle>
              <CardDescription>
                {constraints.length > 0 
                  ? `${constraints.length}件の制約条件が登録されています`
                  : '制約条件が登録されていません'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {constraints.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">制約条件が登録されていません</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    上記のフォームから制約条件を追加してください
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {constraints
                    .sort((a, b) => a.priority_level - b.priority_level) // Sort by priority
                    .map((constraint) => {

                      return (
                        <div key={constraint.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {constraint.constraint_category === '法令遵守' ? (
                                  <Shield className="h-4 w-4 text-red-600" />
                                ) : (
                                  <Target className="h-4 w-4 text-blue-600" />
                                )}
                                <h4 className="font-medium">{constraint.constraint_name}</h4>
                              </div>
                              <Badge 
                                variant={constraint.is_active ? "default" : "secondary"}
                                className={constraint.is_active ? "" : "opacity-60"}
                              >
                                {constraint.is_active ? "有効" : "無効"}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={constraint.constraint_category === '法令遵守' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700'}
                              >
                                {constraint.constraint_category}
                              </Badge>
                              <Badge className={getPriorityLevelColor(constraint.priority_level)}>
                                優先度: {constraint.priority_level}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={constraint.is_active}
                                onCheckedChange={(checked) => handleConstraintToggleActive(constraint.id, checked)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConstraintEdit(constraint)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConstraintDelete(constraint.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p><strong>制約値:</strong> {constraint.constraint_value}</p>
                              </div>
                              <div>
                                <p><strong>適用拠点:</strong> {constraint.applicable_locations.join(', ')}</p>
                                <p><strong>優先度:</strong> {constraint.priority_level} ({getPriorityLevelLabel(constraint.priority_level)})</p>
                                <p><strong>作成日:</strong> {new Date(constraint.created_at).toLocaleDateString('ja-JP')}</p>
                              </div>
                            </div>
                            {constraint.constraint_description && (
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <p><strong>説明:</strong> {constraint.constraint_description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Constraint Groups Tab */}
        <TabsContent value="constraint-groups" className="space-y-6">
          <ConstraintGroupManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}