/**
 * 統合シフトルール管理画面
 * 
 * 制約条件とビジネスルールを統合して管理する画面
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
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import UnifiedRuleManager from '../utils/UnifiedRuleManager';
import EditRuleModal from '../components/EditRuleModal';
import type { UnifiedRule, RuleType } from '../types/unifiedRule';

const UnifiedRuleManagement: React.FC = () => {
  const [rules, setRules] = useState<UnifiedRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<UnifiedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRuleType, setSelectedRuleType] = useState<RuleType | 'all'>('all');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
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
    loadRules();
    loadStatistics();
  }, []);

  // フィルタリング
  useEffect(() => {
    filterRules();
  }, [rules, searchQuery, selectedRuleType, selectedLocations, showActiveOnly]);

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

    // 有効/無効フィルター
    if (showActiveOnly) {
      filtered = filtered.filter(r => r.is_active);
    }

    // ルールタイプフィルター
    if (selectedRuleType !== 'all') {
      filtered = filtered.filter(r => r.rule_type === selectedRuleType);
    }

    // 営業所フィルター（チェックボックス形式）
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(r => 
        selectedLocations.some(loc => r.applicable_locations.includes(loc))
      );
    }

    // 検索クエリフィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.rule_name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.rule_category.toLowerCase().includes(query)
      );
    }

    setFilteredRules(filtered);
  };

  const handleToggleActive = async (id: string) => {
    try {
      await UnifiedRuleManager.toggleRuleActive(id);
      await loadRules();
      await loadStatistics();
    } catch (error) {
      console.error('ルール切り替えエラー:', error);
      alert('ルールの有効/無効切り替えに失敗しました');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await UnifiedRuleManager.deleteRule(id);
      await loadRules();
      await loadStatistics();
    } catch (error) {
      console.error('ルール削除エラー:', error);
      alert('ルールの削除に失敗しました');
    }
  };

  const handleEdit = (rule: UnifiedRule) => {
    setEditingRule(rule);
  };

  const handleSaveEdit = async (updatedRule: UnifiedRule) => {
    try {
      await UnifiedRuleManager.updateRule(updatedRule.id, updatedRule);
      await loadRules();
      await loadStatistics();
    } catch (error) {
      console.error('ルール更新エラー:', error);
      throw error;
    }
  };

  // 強制レベルのアイコン
  const getEnforcementIcon = (level: string) => {
    switch (level) {
      case 'mandatory':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'recommended':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'optional':
        return <Info className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  // 優先度のバッジ色
  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-100 text-red-800';
    if (priority <= 5) return 'bg-yellow-100 text-yellow-800';
    if (priority <= 8) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
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
            制約条件、フィルター、割り当てロジック、検証、最適化ルールを統合管理
          </p>
        </div>
        <Link to="/">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Home className="w-5 h-5" />
            <span>ホーム</span>
          </button>
        </Link>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          <div className="text-sm text-gray-600">その他のルール</div>
          <div className="text-2xl font-bold">
            {(stats.byType.filter || 0) + 
             (stats.byType.assignment || 0) + 
             (stats.byType.validation || 0) + 
             (stats.byType.optimization || 0)}
          </div>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 検索 */}
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

          {/* ルールタイプフィルター */}
          <select
            value={selectedRuleType}
            onChange={(e) => setSelectedRuleType(e.target.value as RuleType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">すべてのタイプ</option>
            <option value="constraint">制約条件</option>
            <option value="filter">フィルター</option>
            <option value="assignment">割り当てロジック</option>
            <option value="validation">検証</option>
            <option value="optimization">最適化</option>
          </select>

          {/* 営業所フィルター（チェックボックス） */}
          <div className="flex items-center gap-4 px-4 py-2 border border-gray-300 rounded-lg bg-white">
            <span className="text-sm text-gray-600 font-medium">営業所:</span>
            {['全拠点', '東京', '川越', '川口'].map(location => (
              <label key={location} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(location)}
                  onChange={() => handleLocationToggle(location)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{location}</span>
              </label>
            ))}
          </div>

          {/* 有効/無効フィルター */}
          <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">有効なルールのみ</span>
          </label>
        </div>
      </div>

      {/* ルール一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ルール名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  適用範囲
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  優先度
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    ルールが見つかりません
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {rule.rule_name}
                      </div>
                      {rule.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {rule.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ruleTypeLabels[rule.rule_type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {rule.applicable_locations.join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(rule.priority_level)}`}>
                        {rule.priority_level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {getEnforcementIcon(rule.enforcement_level)}
                        <span className="text-sm text-gray-900">
                          {enforcementLabels[rule.enforcement_level]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {rule.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          有効
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          無効
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="text-gray-600 hover:text-blue-600"
                          title="編集"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(rule.id)}
                          className="text-gray-600 hover:text-blue-600"
                          title={rule.is_active ? '無効にする' : '有効にする'}
                        >
                          {rule.is_active ? (
                            <PowerOff className="w-5 h-5" />
                          ) : (
                            <Power className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id, rule.rule_name)}
                          className="text-gray-600 hover:text-red-600"
                          title="削除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* フッター */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        {filteredRules.length} 件のルールを表示中（全 {rules.length} 件）
      </div>

      {/* 編集モーダル */}
      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default UnifiedRuleManagement;
