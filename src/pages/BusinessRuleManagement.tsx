import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BusinessRule {
  rule_id: string;
  rule_name: string;
  rule_type: 'employee_filter' | 'pair_business' | 'constraint_check' | 'custom';
  priority: number;
  enabled: boolean;
  営業所: string | null;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

const BusinessRuleManagement = () => {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load rules from API
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/business-rules');
      if (!response.ok) throw new Error('Failed to load rules');
      const data = await response.json();
      setRules(data.sort((a: BusinessRule, b: BusinessRule) => b.priority - a.priority));
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('ルールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (rule: BusinessRule) => {
    try {
      const url = isCreating ? '/api/business-rules' : `/api/business-rules/${rule.rule_id}`;
      const method = isCreating ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });

      if (!response.ok) throw new Error('Failed to save rule');
      
      toast.success(isCreating ? 'ルールを作成しました' : 'ルールを更新しました');
      loadRules();
      setEditingRule(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('ルールの保存に失敗しました');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('このルールを削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/business-rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete rule');
      
      toast.success('ルールを削除しました');
      loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('ルールの削除に失敗しました');
    }
  };

  const handleToggleEnabled = async (rule: BusinessRule) => {
    try {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      const response = await fetch(`/api/business-rules/${rule.rule_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRule)
      });

      if (!response.ok) throw new Error('Failed to toggle rule');
      
      toast.success(updatedRule.enabled ? 'ルールを有効にしました' : 'ルールを無効にしました');
      loadRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('ルールの切り替えに失敗しました');
    }
  };

  const filterRulesByType = (type: string) => {
    return rules.filter(rule => rule.rule_type === type);
  };

  const RuleListCard = ({ rule }: { rule: BusinessRule }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
            <CardDescription>
              {rule.description || 'No description'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.enabled}
              onCheckedChange={() => handleToggleEnabled(rule)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRule(rule)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteRule(rule.rule_id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">ルールID:</span> {rule.rule_id}
          </div>
          <div>
            <span className="font-semibold">優先度:</span> {rule.priority}
          </div>
          <div>
            <span className="font-semibold">営業所:</span> {rule.営業所 || '全営業所'}
          </div>
          <div>
            <span className="font-semibold">ルールタイプ:</span> {rule.rule_type}
          </div>
        </div>
        <div className="mt-4">
          <div className="font-semibold mb-2">条件:</div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(rule.conditions, null, 2)}
          </pre>
        </div>
        <div className="mt-4">
          <div className="font-semibold mb-2">アクション:</div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(rule.actions, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );

  const RuleEditor = ({ rule, onSave, onCancel }: {
    rule: BusinessRule;
    onSave: (rule: BusinessRule) => void;
    onCancel: () => void;
  }) => {
    const [editedRule, setEditedRule] = useState(rule);

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{isCreating ? 'ルールを作成' : 'ルールを編集'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rule_id">ルールID</Label>
              <Input
                id="rule_id"
                value={editedRule.rule_id}
                onChange={(e) => setEditedRule({ ...editedRule, rule_id: e.target.value })}
                disabled={!isCreating}
              />
            </div>
            <div>
              <Label htmlFor="rule_name">ルール名</Label>
              <Input
                id="rule_name"
                value={editedRule.rule_name}
                onChange={(e) => setEditedRule({ ...editedRule, rule_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rule_type">ルールタイプ</Label>
              <Select
                value={editedRule.rule_type}
                onValueChange={(value: any) => setEditedRule({ ...editedRule, rule_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee_filter">従業員フィルタ</SelectItem>
                  <SelectItem value="pair_business">ペア業務</SelectItem>
                  <SelectItem value="constraint_check">制約チェック</SelectItem>
                  <SelectItem value="custom">カスタム</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">優先度</Label>
              <Input
                id="priority"
                type="number"
                value={editedRule.priority}
                onChange={(e) => setEditedRule({ ...editedRule, priority: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="location">営業所</Label>
              <Input
                id="location"
                value={editedRule.営業所 || ''}
                onChange={(e) => setEditedRule({ ...editedRule, 営業所: e.target.value || null })}
                placeholder="空欄で全営業所"
              />
            </div>
            <div>
              <Label htmlFor="description">説明</Label>
              <Input
                id="description"
                value={editedRule.description || ''}
                onChange={(e) => setEditedRule({ ...editedRule, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="conditions">条件 (JSON)</Label>
              <textarea
                id="conditions"
                className="w-full h-32 p-2 border rounded font-mono text-sm"
                value={JSON.stringify(editedRule.conditions, null, 2)}
                onChange={(e) => {
                  try {
                    const conditions = JSON.parse(e.target.value);
                    setEditedRule({ ...editedRule, conditions });
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="actions">アクション (JSON)</Label>
              <textarea
                id="actions"
                className="w-full h-32 p-2 border rounded font-mono text-sm"
                value={JSON.stringify(editedRule.actions, null, 2)}
                onChange={(e) => {
                  try {
                    const actions = JSON.parse(e.target.value);
                    setEditedRule({ ...editedRule, actions });
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editedRule.enabled}
                onCheckedChange={(checked) => setEditedRule({ ...editedRule, enabled: checked })}
              />
              <Label>有効</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onSave(editedRule)}>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const createNewRule = (type: string) => {
    const newRule: BusinessRule = {
      rule_id: '',
      rule_name: '',
      rule_type: type as any,
      priority: 50,
      enabled: true,
      営業所: null,
      conditions: {},
      actions: {},
      description: ''
    };
    setEditingRule(newRule);
    setIsCreating(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">ビジネスルール管理</h1>
          <p className="text-gray-600 mt-2">
            シフト生成時の業務割り当てルールを管理します
          </p>
        </div>

        {editingRule && (
          <RuleEditor
            rule={editingRule}
            onSave={handleSaveRule}
            onCancel={() => {
              setEditingRule(null);
              setIsCreating(false);
            }}
          />
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="employee_filter">従業員フィルタ</TabsTrigger>
            <TabsTrigger value="pair_business">ペア業務</TabsTrigger>
            <TabsTrigger value="constraint_check">制約チェック</TabsTrigger>
            <TabsTrigger value="custom">カスタム</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="mb-4">
              <Button onClick={() => createNewRule('employee_filter')}>
                <Plus className="h-4 w-4 mr-2" />
                新しいルールを作成
              </Button>
            </div>
            {rules.map(rule => (
              <RuleListCard key={rule.rule_id} rule={rule} />
            ))}
          </TabsContent>

          <TabsContent value="employee_filter" className="mt-6">
            <div className="mb-4">
              <Button onClick={() => createNewRule('employee_filter')}>
                <Plus className="h-4 w-4 mr-2" />
                従業員フィルタルールを作成
              </Button>
            </div>
            {filterRulesByType('employee_filter').map(rule => (
              <RuleListCard key={rule.rule_id} rule={rule} />
            ))}
          </TabsContent>

          <TabsContent value="pair_business" className="mt-6">
            <div className="mb-4">
              <Button onClick={() => createNewRule('pair_business')}>
                <Plus className="h-4 w-4 mr-2" />
                ペア業務ルールを作成
              </Button>
            </div>
            {filterRulesByType('pair_business').map(rule => (
              <RuleListCard key={rule.rule_id} rule={rule} />
            ))}
          </TabsContent>

          <TabsContent value="constraint_check" className="mt-6">
            <div className="mb-4">
              <Button onClick={() => createNewRule('constraint_check')}>
                <Plus className="h-4 w-4 mr-2" />
                制約チェックルールを作成
              </Button>
            </div>
            {filterRulesByType('constraint_check').map(rule => (
              <RuleListCard key={rule.rule_id} rule={rule} />
            ))}
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <div className="mb-4">
              <Button onClick={() => createNewRule('custom')}>
                <Plus className="h-4 w-4 mr-2" />
                カスタムルールを作成
              </Button>
            </div>
            {filterRulesByType('custom').map(rule => (
              <RuleListCard key={rule.rule_id} rule={rule} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="fixed bottom-4 right-4">
        <Link to="/">
          <Button variant="outline" size="icon">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </>
  );
};

export default BusinessRuleManagement;
