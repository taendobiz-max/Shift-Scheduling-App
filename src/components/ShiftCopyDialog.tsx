import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Calendar } from 'lucide-react';
import { copyShifts, copyPreviousWeek, copyPreviousMonth } from '@/utils/shiftCopy';
import { toast } from 'sonner';

interface ShiftCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: string[];
  onCopyComplete: () => void;
}

export function ShiftCopyDialog({ open, onOpenChange, locations, onCopyComplete }: ShiftCopyDialogProps) {
  const [copyMode, setCopyMode] = useState<'custom' | 'previous-week' | 'previous-month'>('custom');
  const [sourceStartDate, setSourceStartDate] = useState('');
  const [sourceEndDate, setSourceEndDate] = useState('');
  const [targetStartDate, setTargetStartDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = async () => {
    setError('');

    // バリデーション
    if (copyMode === 'custom') {
      if (!sourceStartDate || !sourceEndDate || !targetStartDate) {
        setError('すべての日付を入力してください');
        return;
      }

      if (new Date(sourceStartDate) > new Date(sourceEndDate)) {
        setError('コピー元の開始日は終了日より前である必要があります');
        return;
      }
    } else {
      if (!targetStartDate) {
        setError('コピー先の開始日を入力してください');
        return;
      }
    }

    try {
      setIsLoading(true);

      let copiedCount = 0;

      if (copyMode === 'previous-week') {
        copiedCount = await copyPreviousWeek(targetStartDate, selectedLocation);
      } else if (copyMode === 'previous-month') {
        copiedCount = await copyPreviousMonth(targetStartDate, selectedLocation);
      } else {
        copiedCount = await copyShifts({
          sourceStartDate,
          sourceEndDate,
          targetStartDate,
          location: selectedLocation
        });
      }

      toast.success(`${copiedCount}件のシフトをコピーしました`);
      onCopyComplete();
      onOpenChange(false);
      
      // フォームをリセット
      setSourceStartDate('');
      setSourceEndDate('');
      setTargetStartDate('');
      setSelectedLocation('all');
      setCopyMode('custom');
    } catch (error: any) {
      console.error('シフトコピーエラー:', error);
      setError(error.message || 'シフトのコピーに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            シフトをコピー
          </DialogTitle>
          <DialogDescription>
            既存のシフトを別の期間にコピーします
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* コピーモード選択 */}
          <div className="space-y-2">
            <Label>コピーモード</Label>
            <Select value={copyMode} onValueChange={(value: any) => setCopyMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">期間を指定</SelectItem>
                <SelectItem value="previous-week">前週をコピー</SelectItem>
                <SelectItem value="previous-month">前月をコピー</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* カスタム期間選択 */}
          {copyMode === 'custom' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sourceStartDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  コピー元の開始日
                </Label>
                <Input
                  id="sourceStartDate"
                  type="date"
                  value={sourceStartDate}
                  onChange={(e) => setSourceStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceEndDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  コピー元の終了日
                </Label>
                <Input
                  id="sourceEndDate"
                  type="date"
                  value={sourceEndDate}
                  onChange={(e) => setSourceEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* コピー先の開始日 */}
          <div className="space-y-2">
            <Label htmlFor="targetStartDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              コピー先の開始日
            </Label>
            <Input
              id="targetStartDate"
              type="date"
              value={targetStartDate}
              onChange={(e) => setTargetStartDate(e.target.value)}
            />
          </div>

          {/* 拠点選択 */}
          <div className="space-y-2">
            <Label>拠点</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="拠点を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全拠点</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 注意事項 */}
          <Alert>
            <AlertDescription>
              コピー先の期間に既存のシフトがある場合、上書きされます。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleCopy} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                コピー中...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                コピー
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
