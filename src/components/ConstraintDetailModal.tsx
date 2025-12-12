/**
 * 制約条件詳細編集モーダル
 * 新しいフィールド（constraint_scope, evaluation_timing, condition_rules, calculation_formula）を含む
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { 
  EnhancedConstraint, 
  ConstraintFormData,
  CONSTRAINT_CATEGORIES,
  CONSTRAINT_TYPES,
  ENFORCEMENT_LEVELS,
  CONSTRAINT_SCOPES,
  EVALUATION_TIMINGS
} from '@/types/constraint';

interface ConstraintDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  constraint: EnhancedConstraint | null;
  onSave: (data: ConstraintFormData) => Promise<void>;
}

export function ConstraintDetailModal({ isOpen, onClose, constraint, onSave }: ConstraintDetailModalProps) {
  const [formData, setFormData] = useState<ConstraintFormData>({
    constraint_name: '',
    constraint_category: 'その他',
    constraint_value: 0,
    constraint_description: '',
    applicable_locations: [],
    priority_level: 50,
    enforcement_level: 'flexible',
    is_active: true,
    constraint_scope: 'employee',
    evaluation_timing: 'pre_assignment',
    condition_rules: {},
    calculation_formula: {}
  });

  const [conditionRulesJson, setConditionRulesJson] = useState('{}');
  const [calculationFormulaJson, setCalculationFormulaJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (constraint) {
      setFormData({
        constraint_name: constraint.constraint_name,
        constraint_category: constraint.constraint_category,
        constraint_type: constraint.constraint_type,
        constraint_value: constraint.constraint_value,
        constraint_description: constraint.constraint_description,
        applicable_locations: constraint.applicable_locations,
        priority_level: constraint.priority_level,
        enforcement_level: constraint.enforcement_level,
        is_active: constraint.is_active,
        constraint_scope: constraint.constraint_scope || 'employee',
        evaluation_timing: constraint.evaluation_timing || 'pre_assignment',
        condition_rules: constraint.condition_rules || {},
        calculation_formula: constraint.calculation_formula || {}
      });
      
      setConditionRulesJson(JSON.stringify(constraint.condition_rules || {}, null, 2));
      setCalculationFormulaJson(JSON.stringify(constraint.calculation_formula || {}, null, 2));
    } else {
      // 新規作成時のデフォルト値
      setFormData({
        constraint_name: '',
        constraint_category: 'その他',
        constraint_value: 0,
        constraint_description: '',
        applicable_locations: ['全拠点'],
        priority_level: 50,
        enforcement_level: 'flexible',
        is_active: true,
        constraint_scope: 'employee',
        evaluation_timing: 'pre_assignment',
        condition_rules: {},
        calculation_formula: {}
      });
      
      setConditionRulesJson('{}');
      setCalculationFormulaJson('{}');
    }
    setJsonError(null);
  }, [constraint]);

  const handleConditionRulesChange = (value: string) => {
    setConditionRulesJson(value);
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, condition_rules: parsed });
      setJsonError(null);
    } catch (error) {
      setJsonError('条件ルールのJSON形式が正しくありません');
    }
  };

  const handleCalculationFormulaChange = (value: string) => {
    setCalculationFormulaJson(value);
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, calculation_formula: parsed });
      setJsonError(null);
    } catch (error) {
      setJsonError('計算式のJSON形式が正しくありません');
    }
  };

  const handleSave = async () => {
    if (!formData.constraint_name) {
      toast.error('制約名を入力してください');
      return;
    }

    if (jsonError) {
      toast.error('JSON形式のエラーを修正してください');
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save constraint:', error);
      toast.error('制約条件の保存に失敗しました');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{constraint ? '制約条件編集' : '新規制約条件作成'}</DialogTitle>
          <DialogDescription>
            制約条件の詳細情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="advanced">詳細設定</TabsTrigger>
            <TabsTrigger value="rules">条件・計算式</TabsTrigger>
          </TabsList>

          {/* 基本情報タブ */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="constraint_name">制約名 *</Label>
                <Input
                  id="constraint_name"
                  value={formData.constraint_name}
                  onChange={(e) => setFormData({ ...formData, constraint_name: e.target.value })}
                  placeholder="例: 最大連続出勤日数"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraint_category">カテゴリ *</Label>
                <Select
                  value={formData.constraint_category}
                  onValueChange={(value: '法令遵守' | 'その他') => 
                    setFormData({ ...formData, constraint_category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTRAINT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="constraint_type">制約タイプ</Label>
                <Select
                  value={formData.constraint_type}
                  onValueChange={(value) => setFormData({ ...formData, constraint_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTRAINT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraint_value">制約値 *</Label>
                <Input
                  id="constraint_value"
                  type="number"
                  value={formData.constraint_value}
                  onChange={(e) => setFormData({ ...formData, constraint_value: Number(e.target.value) })}
                  placeholder="例: 6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="constraint_description">説明</Label>
              <Textarea
                id="constraint_description"
                value={formData.constraint_description}
                onChange={(e) => setFormData({ ...formData, constraint_description: e.target.value })}
                placeholder="制約条件の詳細説明を入力してください"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enforcement_level">強制レベル</Label>
                <Select
                  value={formData.enforcement_level}
                  onValueChange={(value: 'mandatory' | 'strict' | 'flexible') => 
                    setFormData({ ...formData, enforcement_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENFORCEMENT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <span className={level.color}>{level.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority_level">優先度 (0-100)</Label>
                <Input
                  id="priority_level"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority_level}
                  onChange={(e) => setFormData({ ...formData, priority_level: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">有効化</Label>
            </div>
          </TabsContent>

          {/* 詳細設定タブ */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="constraint_scope">制約スコープ</Label>
                <Select
                  value={formData.constraint_scope}
                  onValueChange={(value: any) => setFormData({ ...formData, constraint_scope: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSTRAINT_SCOPES.map((scope) => (
                      <SelectItem key={scope.value} value={scope.value}>
                        <div>
                          <div>{scope.label}</div>
                          <div className="text-xs text-gray-500">{scope.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluation_timing">評価タイミング</Label>
                <Select
                  value={formData.evaluation_timing}
                  onValueChange={(value: any) => setFormData({ ...formData, evaluation_timing: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVALUATION_TIMINGS.map((timing) => (
                      <SelectItem key={timing.value} value={timing.value}>
                        <div>
                          <div>{timing.label}</div>
                          <div className="text-xs text-gray-500">{timing.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>適用拠点</Label>
              <div className="flex flex-wrap gap-2">
                {['全拠点', '川越', '東京'].map((location) => (
                  <Badge
                    key={location}
                    variant={formData.applicable_locations.includes(location) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const locations = formData.applicable_locations.includes(location)
                        ? formData.applicable_locations.filter(l => l !== location)
                        : [...formData.applicable_locations, location];
                      setFormData({ ...formData, applicable_locations: locations });
                    }}
                  >
                    {location}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">制約スコープと評価タイミングについて</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>従業員スコープ</strong>: 個々の従業員に対して評価（例: 最大連勤、月間休暇）</li>
                    <li><strong>業務スコープ</strong>: 特定の業務に対して評価（例: 手当均等配分）</li>
                    <li><strong>日付スコープ</strong>: 特定の日付に対して評価（例: 友引の出勤人数）</li>
                    <li><strong>割当前評価</strong>: シフト割り当て前にチェック（ハード制約）</li>
                    <li><strong>累積評価</strong>: 期間全体で評価（月間集計など）</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 条件・計算式タブ */}
          <TabsContent value="rules" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="condition_rules">条件ルール (JSON形式)</Label>
              <Textarea
                id="condition_rules"
                value={conditionRulesJson}
                onChange={(e) => handleConditionRulesChange(e.target.value)}
                placeholder='{"min_required": 6, "period": "monthly"}'
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calculation_formula">計算式 (JSON形式)</Label>
              <Textarea
                id="calculation_formula"
                value={calculationFormulaJson}
                onChange={(e) => handleCalculationFormulaChange(e.target.value)}
                placeholder='{"calculate": "count_days_without_shift", "condition": "result >= min_required"}'
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {jsonError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{jsonError}</p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold mb-2">制約タイプ別の設定例</p>
              <div className="space-y-2 text-xs text-gray-700">
                <div>
                  <strong>月間休暇日数:</strong>
                  <pre className="bg-white p-2 rounded mt-1">
{`condition_rules: {"min_required": 6, "period": "monthly"}`}
                  </pre>
                </div>
                <div>
                  <strong>手当均等配分:</strong>
                  <pre className="bg-white p-2 rounded mt-1">
{`condition_rules: {"business_filter": "has_allowance = true", "max_difference": 1}`}
                  </pre>
                </div>
                <div>
                  <strong>友引の出勤人数:</strong>
                  <pre className="bg-white p-2 rounded mt-1">
{`condition_rules: {"tomobiki_extra": 5, "normal_extra": 10}`}
                  </pre>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!!jsonError}>
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
