import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { OFFICES } from '@/constants';

interface SpotBusinessMaster {
  id: string;
  business_name: string;
  office: string;
  default_departure_time: string | null;
  default_return_time: string | null;
  memo: string | null;
  is_active: boolean;
  created_at: string;
}

interface SpotBusinessMasterForm {
  business_name: string;
  office: string;
  default_departure_time: string;
  default_return_time: string;
  memo: string;
}

// OFFICES は @/constants からインポート

export function SpotBusinessMasterManagement() {
  const [spotMasters, setSpotMasters] = useState<SpotBusinessMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SpotBusinessMasterForm>({
    business_name: '',
    office: '川越',
    default_departure_time: '',
    default_return_time: '',
    memo: ''
  });

  useEffect(() => {
    loadSpotMasters();
  }, []);

  const loadSpotMasters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spot_business_master')
        .select('*')
        .order('office')
        .order('business_name');

      if (error) throw error;
      setSpotMasters(data || []);
    } catch (error) {
      console.error('Error loading spot business masters:', error);
      toast.error('スポット業務マスターの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      business_name: '',
      office: '川越',
      default_departure_time: '',
      default_return_time: '',
      memo: ''
    });
    setShowDialog(true);
  };

  const handleEdit = (master: SpotBusinessMaster) => {
    setEditingId(master.id);
    setFormData({
      business_name: master.business_name,
      office: master.office,
      default_departure_time: master.default_departure_time || '',
      default_return_time: master.default_return_time || '',
      memo: master.memo || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.business_name || !formData.office) {
      toast.error('業務名と営業所は必須です');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        business_name: formData.business_name,
        office: formData.office,
        default_departure_time: formData.default_departure_time || null,
        default_return_time: formData.default_return_time || null,
        memo: formData.memo || null,
        is_active: true
      };

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('spot_business_master')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('スポット業務マスターを更新しました');
      } else {
        // Insert
        const { error } = await supabase
          .from('spot_business_master')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success('スポット業務マスターを登録しました');
      }

      setShowDialog(false);
      loadSpotMasters();
    } catch (error) {
      console.error('Error saving spot business master:', error);
      toast.error('スポット業務マスターの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, businessName: string) => {
    if (!confirm(`「${businessName}」を削除してもよろしいですか？`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('spot_business_master')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('スポット業務マスターを削除しました');
      loadSpotMasters();
    } catch (error) {
      console.error('Error deleting spot business master:', error);
      toast.error('スポット業務マスターの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('spot_business_master')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? '無効化しました' : '有効化しました');
      loadSpotMasters();
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('ステータスの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>スポット業務マスター</CardTitle>
            <CardDescription>
              よく使うスポット業務をマスター登録して、シフト登録時に簡単に選択できます
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadSpotMasters} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>営業所</TableHead>
              <TableHead>業務名</TableHead>
              <TableHead>出庫時間</TableHead>
              <TableHead>帰庫時間</TableHead>
              <TableHead>備忘メモ</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spotMasters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500">
                  スポット業務マスターが登録されていません
                </TableCell>
              </TableRow>
            ) : (
              spotMasters.map((master) => (
                <TableRow key={master.id}>
                  <TableCell>{master.office}</TableCell>
                  <TableCell className="font-medium">{master.business_name}</TableCell>
                  <TableCell>{master.default_departure_time || '-'}</TableCell>
                  <TableCell>{master.default_return_time || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{master.memo || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant={master.is_active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleActive(master.id, master.is_active)}
                    >
                      {master.is_active ? '有効' : '無効'}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(master)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(master.id, master.business_name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'スポット業務マスター編集' : 'スポット業務マスター登録'}
            </DialogTitle>
            <DialogDescription>
              よく使うスポット業務の情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>営業所 *</Label>
              <Select
                value={formData.office}
                onValueChange={(value) => setFormData({ ...formData, office: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFICES.map((office) => (
                    <SelectItem key={office} value={office}>
                      {office}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>業務名 *</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="例: ○○病院送迎"
              />
            </div>

            <div>
              <Label>デフォルト出庫時間</Label>
              <Input
                type="time"
                value={formData.default_departure_time}
                onChange={(e) => setFormData({ ...formData, default_departure_time: e.target.value })}
              />
            </div>

            <div>
              <Label>デフォルト帰庫時間</Label>
              <Input
                type="time"
                value={formData.default_return_time}
                onChange={(e) => setFormData({ ...formData, default_return_time: e.target.value })}
              />
            </div>

            <div>
              <Label>備忘メモ</Label>
              <Textarea
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                placeholder="例: 駐車場は裏側"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '保存中...' : editingId ? '更新' : '登録'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
