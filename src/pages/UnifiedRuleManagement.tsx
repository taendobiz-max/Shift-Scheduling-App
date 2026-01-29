/**
 * 統合シフトルール管理画面（タブ方式）
 * 
 * ルール管理、除外乗務員管理、相性ペア管理を統合
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Power, 
  PowerOff,
  Filter,
  Search,
  ChevronDown,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Home,
  UserX,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UnifiedRuleManager from '../utils/UnifiedRuleManager';
import EditRuleModal from '../components/EditRuleModal';
import { ExcludedEmployeesManagement } from '../components/ExcludedEmployeesManagement';
import { IncompatiblePairsManagement } from '../components/IncompatiblePairsManagement';
import type { UnifiedRule, RuleType } from '../types/unifiedRule';

const UnifiedRuleManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState<UnifiedRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<UnifiedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRuleType, setSelectedRuleType] = useState<RuleType | 'all'>('all');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [editingRule, setEditingRule] = useState<UnifiedRule | null>(null);
  
  // 統計情報
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    byType: {} as Record<RuleType, number>,
    byEnforcement: {} as Record<string, number>
  });

  // ルールタイプのラベル
  const ruleTypeLabels: Record<RuleType, string> = {
    constraint: '制約条件',
    filter: 'フィルター',
    assignment: '割り当てロジック',
    validation: '検証',
    optimization: '最適化'
  };

  // 強制レベルのラベル
  const enforcementLabels: Record<string, string> = {
    mandatory: '必須',
    recommended: '推奨',
    optional: 'オプション'
  };

  // データ読み込み
  useEffect(() => {
    if (activeTab === 'rules') {
      loadRules();
      loadStatistics();
    }
  }, [activeTab]);

  // フィルタリング
  useEffect(() => {
    filterRules();
  }, [rules, searchQuery, selectedRuleType, selectedLocations]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await UnifiedRuleManager.getAllRules();
      setRules(data);
    } catch (error) {
      console.error('ルール読み込みエラー:', error);
      alert('ルールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await UnifiedRuleManager.getRuleStatistics();
      setStats(data);
    } catch (error) {
      console.error('統計情報読み込みエラー:', error);
    }
  };

  const handleLocationToggle = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location)
        ? prev.filter(loc => loc !== location)
        : [...prev, location]
    );
  };

  const filterRules = () => {
    let filtered = [...rules];

    // 検索クエリでフィルタリング
    if (searchQuery) {
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // ルールタイプでフィルタリング
    if (selectedRuleType !== 'all') {
      filtered = filtered.filter(rule => rule.rule_type === selectedRuleType);
    }

    // 拠点でフィルタリング
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(rule =>
        selectedLocations.some(loc => rule.applicable_locations?.includes(loc))
      );
    }

    setFilteredRules(filtered);
  };

  const handleToggleActive = async (ruleId: string) => {
    try {
      await UnifiedRuleManager.toggleRuleActive(ruleId);
      await loadRules();
      await loadStatistics();
    } catch (error) {
      console.error('ルール有効/無効切り替えエラー:', error);
      alert('ルールの有効/無効切り替えに失敗しました');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('このルールを削除してもよろしいですか？')) {
      return;
    }

    try {
      await UnifiedRuleManager.deleteRule(ruleId);
      await loadRules();
      await loadStatistics();
    } catch (error) {
      console.error('ルール削除エラー:', error);
      alert('ルールの削除に失敗しました');
    }
  };

  const handleSaveRule = async () => {
    await loadRules();
    await loadStatistics();
    setEditingRule(null);
  };

  if (loading && activeTab === 'rules') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            シフトルール管理
          </h1>
          <p className="text-gray-600">
            ルール、除外乗務員、相性ペアを統合管理
          </p>
        </div>
        <Link to="/">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Home className="w-5 h-5" />
            <span>ホーム</span>
          </button>
        </Link>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            ルール管理
          </TabsTrigger>
          <TabsTrigger value="excluded" className="flex items-center gap-2">
            <UserX className="h-4 w-4" />
            除外乗務員
          </TabsTrigger>
          <TabsTrigger value="pairs" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            相性ペア
          </TabsTrigger>
        </TabsList>

        {/* ルール管理タブ */}
        <TabsContent value="rules" className="space-y-6">
          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">総ルール数</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">有効なルール</div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">制約条件</div>
              <div className="text-2xl font-bold">{stats.byType.constraint || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">フィルター</div>
              <div className="text-2xl font-bold">{stats.byType.filter || 0}</div>
            </div>
          </div>

          {/* フィルターと検索 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 検索 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ルール名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* ルールタイプフィルター */}
              <div className="w-full md:w-48">
                <select
                  value={selectedRuleType}
                  onChange={(e) => setSelectedRuleType(e.target.value as RuleType | 'all')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">すべてのタイプ</option>
                  {Object.entries(ruleTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 新規作成ボタン */}
              <button
                onClick={() => setEditingRule({} as UnifiedRule)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>新規作成</span>
              </button>
            </div>

            {/* 拠点フィルター */}
            <div className="mt-4 flex flex-wrap gap-2">
              {['川越', '東京', '川口'].map((location) => (
                <label key={location} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location)}
                    onChange={() => handleLocationToggle(location)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{location}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ルール一覧 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ルール名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイプ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    拠点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    強制レベル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      ルールが見つかりません
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-gray-500">{rule.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {ruleTypeLabels[rule.rule_type]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {rule.applicable_locations?.join(', ') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rule.enforcement_level === 'mandatory' ? 'bg-red-100 text-red-800' :
                          rule.enforcement_level === 'recommended' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enforcementLabels[rule.enforcement_level]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {rule.is_active ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            有効
                          </span>
                        ) : (
                          <span className="flex items-center text-gray-400">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            無効
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編集"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(rule.id)}
                            className={rule.is_active ? "text-gray-600 hover:text-gray-900" : "text-green-600 hover:text-green-900"}
                            title={rule.is_active ? "無効化" : "有効化"}
                          >
                            {rule.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="text-red-600 hover:text-red-900"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 除外乗務員管理タブ */}
        <TabsContent value="excluded">
          <ExcludedEmployeesManagement />
        </TabsContent>

        {/* 相性ペア管理タブ */}
        <TabsContent value="pairs">
          <IncompatiblePairsManagement />
        </TabsContent>
      </Tabs>

      {/* ルール編集モーダル */}
      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={handleSaveRule}
        />
      )}
    </div>
  );
};

export default UnifiedRuleManagement;
