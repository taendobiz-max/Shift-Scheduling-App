/**
 * 制約グループ管理コンポーネント
 * マスターデータ管理画面の新しいタブとして追加
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Save, X, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { EnhancedConstraint } from '@/types/constraint';
import { getAllConstraintGroups, getConstraintsByGroupId } from '@/utils/constraintGroupEvaluator';

interface ConstraintGroup {
  id: string;
  group_name: string;
  group_description?: string;
  evaluation_logic: 'OR' | 'AND';
  priority_level: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  constraints?: EnhancedConstraint[];
}

interface ConstraintGroupFormData {
  group_name: string;
  group_description: string;
  evaluation_logic: 'OR' | 'AND';
  priority_level: number;
  is_active: boolean;
}

export default function ConstraintGroupManagement() {
  const [groups, setGroups] = useState<ConstraintGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [availableConstraints, setAvailableConstraints] = useState<EnhancedConstraint[]>([]);
  const [selectedConstraints, setSelectedConstraints] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<ConstraintGroupFormData>({
    group_name: '',
    group_description: '',
    evaluation_logic: 'OR',
    priority_level: 50,
    is_active: true
  });

  // 制約グループ一覧を読み込み
  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await getAllConstraintGroups();
      
      // 各グループの制約条件を読み込み
      const groupsWithConstraints = await Promise.all(
        data.map(async (group) => {
          const constraints = await getConstraintsByGroupId(group.id);
          return { ...group, constraints };
        })
      );
      
      setGroups(groupsWithConstraints);
      console.log('✅ [GROUP] Loaded constraint groups:', groupsWithConstraints.length);
    } catch (error) {
      console.error('❌ [GROUP] Failed to load constraint groups:', error);
      toast.error('制約グループの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 利用可能な制約条件を読み込み
  const loadAvailableConstraints = async () => {
    try {
      const { data, error } = await supabase
        .from('app_9213e72257_enhanced_constraints')
        .select('*')
        .eq('is_active', true)
        .order('constraint_name');
      
      if (error) throw error;
      setAvailableConstraints(data || []);
    } catch (error) {
      console.error('❌ [GROUP] Failed to load constraints:', error);
      toast.error('制約条件の読み込みに失敗しました');
    }
  };

  useEffect(() => {
    loadGroups();
    loadAvailableConstraints();
  }, []);

  // 新規作成
  const handleCreate = () => {
    setIsEditing(true);
    setEditingGroupId(null);
    setFormData({
      group_name: '',
      group_description: '',
      evaluation_logic: 'OR',
      priority_level: 50,
      is_active: true
    });
    setSelectedConstraints([]);
  };

  // 編集
  const handleEdit = (group: ConstraintGroup) => {
    setIsEditing(true);
    setEditingGroupId(group.id);
    setFormData({
      group_name: group.group_name,
      group_description: group.group_description || '',
      evaluation_logic: group.evaluation_logic,
      priority_level: group.priority_level,
      is_active: group.is_active
    });
    setSelectedConstraints(group.constraints?.map(c => c.id) || []);
  };

  // 保存
  const handleSave = async () => {
    if (!formData.group_name.trim()) {
      toast.error('グループ名を入力してください');
      return;
    }

    try {
      if (editingGroupId) {
        // 更新
        const { error } = await supabase
          .from('app_9213e72257_constraint_groups')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingGroupId);
        
        if (error) throw error;
        
        // 制約条件の関連付けを更新
        await updateConstraintAssociations(editingGroupId, selectedConstraints);
        
        toast.success('制約グループを更新しました');
      } else {
        // 新規作成
        const { data, error } = await supabase
          .from('app_9213e72257_constraint_groups')
          .insert(formData)
          .select()
          .single();
        
        if (error) throw error;
        
        // 制約条件の関連付け
        if (data) {
          await updateConstraintAssociations(data.id, selectedConstraints);
        }
        
        toast.success('制約グループを作成しました');
      }
      
      setIsEditing(false);
      setEditingGroupId(null);
      loadGroups();
    } catch (error) {
      console.error('❌ [GROUP] Failed to save constraint group:', error);
      toast.error('制約グループの保存に失敗しました');
    }
  };

  // 制約条件の関連付けを更新
  const updateConstraintAssociations = async (groupId: string, constraintIds: string[]) => {
    try {
      // 既存の関連付けをすべて解除
      await supabase
        .from('app_9213e72257_enhanced_constraints')
        .update({ constraint_group_id: null })
        .eq('constraint_group_id', groupId);
      
      // 新しい関連付けを設定
      if (constraintIds.length > 0) {
        await supabase
          .from('app_9213e72257_enhanced_constraints')
          .update({ constraint_group_id: groupId })
          .in('id', constraintIds);
      }
    } catch (error) {
      console.error('❌ [GROUP] Failed to update constraint associations:', error);
      throw error;
    }
  };

  // 削除
  const handleDelete = async (groupId: string) => {
    if (!confirm('この制約グループを削除してもよろしいですか？')) {
      return;
    }

    try {
      // 関連付けを解除
      await supabase
        .from('app_9213e72257_enhanced_constraints')
        .update({ constraint_group_id: null })
        .eq('constraint_group_id', groupId);
      
      // グループを削除
      const { error } = await supabase
        .from('app_9213e72257_constraint_groups')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
      
      toast.success('制約グループを削除しました');
      loadGroups();
    } catch (error) {
      console.error('❌ [GROUP] Failed to delete constraint group:', error);
      toast.error('制約グループの削除に失敗しました');
    }
  };

  // キャンセル
  const handleCancel = () => {
    setIsEditing(false);
    setEditingGroupId(null);
  };

  // 制約条件の選択/解除
  const toggleConstraintSelection = (constraintId: string) => {
    setSelectedConstraints(prev =>
      prev.includes(constraintId)
        ? prev.filter(id => id !== constraintId)
        : [...prev, constraintId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            制約グループ管理
          </h2>
          <p className="text-gray-600 mt-1">
            複数の制約条件をOR/AND条件でグループ化して管理
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新規グループ作成
          </Button>
        )}
      </div>

      {/* 編集フォーム */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{editingGroupId ? '制約グループ編集' : '新規制約グループ作成'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group_name">グループ名 *</Label>
                <Input
                  id="group_name"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  placeholder="例: 休息時間ルール"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="evaluation_logic">評価ロジック *</Label>
                <Select
                  value={formData.evaluation_logic}
                  onValueChange={(value: 'OR' | 'AND') => setFormData({ ...formData, evaluation_logic: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OR">OR（いずれか1つを満たせばOK）</SelectItem>
                    <SelectItem value="AND">AND（すべてを満たす必要あり）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_description">説明</Label>
              <Textarea
                id="group_description"
                value={formData.group_description}
                onChange={(e) => setFormData({ ...formData, group_description: e.target.value })}
                placeholder="このグループの目的や条件を説明してください"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority_level">優先度レベル</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="priority_level"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority_level}
                    onChange={(e) => setFormData({ ...formData, priority_level: parseInt(e.target.value) || 0 })}
                  />
                  <span className="text-sm text-gray-600">
                    {formData.priority_level === 0 ? '必須' : formData.priority_level <= 20 ? '高' : formData.priority_level <= 50 ? '中' : '低'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">0=必須、100=任意</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">有効</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <span className="text-sm">{formData.is_active ? '有効' : '無効'}</span>
                </div>
              </div>
            </div>

            {/* 制約条件の選択 */}
            <div className="space-y-2">
              <Label>グループに含める制約条件</Label>
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                {availableConstraints.length === 0 ? (
                  <p className="text-gray-500 text-sm">利用可能な制約条件がありません</p>
                ) : (
                  availableConstraints.map((constraint) => (
                    <div key={constraint.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedConstraints.includes(constraint.id)}
                        onChange={() => toggleConstraintSelection(constraint.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{constraint.constraint_name}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({constraint.constraint_category})
                        </span>
                      </div>
                      <Badge variant={constraint.priority_level === 0 ? 'destructive' : 'secondary'}>
                        優先度: {constraint.priority_level}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500">
                ※ 分割休息ルールは自動的に休息時間グループに適用されます
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* グループ一覧 */}
      {!isEditing && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">制約グループが登録されていません</p>
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  最初のグループを作成
                </Button>
              </CardContent>
            </Card>
          ) : (
            groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{group.group_name}</CardTitle>
                        <Badge variant={group.evaluation_logic === 'OR' ? 'default' : 'secondary'}>
                          {group.evaluation_logic}条件
                        </Badge>
                        <Badge variant={group.priority_level === 0 ? 'destructive' : 'outline'}>
                          優先度: {group.priority_level}
                        </Badge>
                        {!group.is_active && (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </div>
                      {group.group_description && (
                        <CardDescription>{group.group_description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(group.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {group.evaluation_logic === 'OR' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      {group.evaluation_logic === 'OR' 
                        ? 'いずれか1つの条件を満たせばOK' 
                        : 'すべての条件を満たす必要があります'}
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">含まれる制約条件:</p>
                      {!group.constraints || group.constraints.length === 0 ? (
                        <p className="text-sm text-gray-500">制約条件が設定されていません</p>
                      ) : (
                        <ul className="space-y-1">
                          {group.constraints.map((constraint, index) => (
                            <li key={constraint.id} className="text-sm flex items-center gap-2">
                              <span className="text-gray-400">{index + 1}.</span>
                              <span>{constraint.constraint_name}</span>
                              <span className="text-gray-500">
                                ({constraint.constraint_category})
                              </span>
                            </li>
                          ))}
                          {group.group_name.includes('休息') && (
                            <li className="text-sm flex items-center gap-2 text-blue-600">
                              <span className="text-gray-400">{(group.constraints.length || 0) + 1}.</span>
                              <span>分割休息ルール（システム組み込み）</span>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

