/**
 * ルール編集モーダル
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { UnifiedRule, RuleType } from '../types/unifiedRule';

interface EditRuleModalProps {
  rule: UnifiedRule;
  onClose: () => void;
  onSave: (updatedRule: UnifiedRule) => Promise<void>;
}

const EditRuleModal: React.FC<EditRuleModalProps> = ({ rule, onClose, onSave }) => {
  const [formData, setFormData] = useState<UnifiedRule>(rule.id ? rule : {
    ...rule,
    rule_name: '',
    rule_type: 'constraint',
    rule_category: '',
    description: '',
    applicable_locations: ['全拠点'],
    priority_level: 5,
    enforcement_level: 'recommended',
    rule_config: {},
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  // ルールタイプのラベル
  const ruleTypeLabels: Record<RuleType, string> = {
    constraint: '制約条件',
    filter: 'フィルター',
    assignment: '割り当てロジック',
    validation: '検証',
    optimization: '最適化'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    const newLocations = checked
      ? [...formData.applicable_locations, location]
      : formData.applicable_locations.filter(l => l !== location);
    
    setFormData({ ...formData, applicable_locations: newLocations });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">{rule.id ? 'ルール編集' : 'ルール新規作成'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ルール名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ルール名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* ルールタイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ルールタイプ <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.rule_type}
              onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as RuleType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {Object.entries(ruleTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.rule_category}
              onChange={(e) => setFormData({ ...formData, rule_category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 適用営業所 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              適用営業所 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {['全拠点', '東京', '川越', '川口'].map((location) => (
                <label key={location} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_locations.includes(location)}
                    onChange={(e) => handleLocationChange(location, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{location}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 優先度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度（0-10） <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="10"
                value={formData.priority_level}
                onChange={(e) => setFormData({ ...formData, priority_level: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-lg font-bold text-gray-900 w-12 text-center">
                {formData.priority_level}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              0: 最高優先度、10: 最低優先度
            </p>
          </div>

          {/* 強制レベル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              強制レベル <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.enforcement_level}
              onChange={(e) => setFormData({ ...formData, enforcement_level: e.target.value as 'mandatory' | 'recommended' | 'optional' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="mandatory">必須</option>
              <option value="recommended">推奨</option>
              <option value="optional">オプション</option>
            </select>
          </div>

          {/* ルール設定（JSON） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ルール設定（JSON）
            </label>
            <textarea
              value={JSON.stringify(formData.rule_config, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setFormData({ ...formData, rule_config: config });
                } catch (error) {
                  // JSON パースエラーは無視（入力中）
                }
              }}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON形式で入力してください
            </p>
          </div>

          {/* 有効/無効 */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">このルールを有効にする</span>
            </label>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRuleModal;
