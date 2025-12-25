import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Employee } from '@/types';

interface CSVUploaderProps {
  onUpload: (employees: Omit<Employee, 'id'>[]) => void;
  onClose: () => void;
}

interface CSVRowData {
  name: string;
  employeeNumber: string;
  depot: string;
  employmentType: string;
  skills: string;
  maxConsecutiveDays: string;
  monthlyHourLimit: string;
  specialNotes: string;
}

export default function CSVUploader({ onUpload, onClose }: CSVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Omit<Employee, 'id'>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const downloadTemplate = () => {
    const template = [
      ['name', 'employeeNumber', 'depot', 'employmentType', 'skills', 'maxConsecutiveDays', 'monthlyHourLimit', 'specialNotes'],
      ['田中太郎', 'EMP001', '川越営業所', 'full-time', '大型免許,路線バス,高速バス', '5', '180', ''],
      ['佐藤花子', 'EMP002', '川越営業所', 'full-time', '大型免許,路線バス', '5', '180', ''],
      ['鈴木次郎', 'EMP003', '東京営業所', 'part-time', '大型免許,路線バス,観光バス', '3', '120', '']
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'employee_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const expectedHeaders = ['name', 'employeeNumber', 'depot', 'employmentType', 'skills', 'maxConsecutiveDays', 'monthlyHourLimit', 'specialNotes'];
        const headerErrors: string[] = [];
        
        expectedHeaders.forEach(expectedHeader => {
          if (!headers.includes(expectedHeader)) {
            headerErrors.push(`必須ヘッダー "${expectedHeader}" が見つかりません`);
          }
        });

        if (headerErrors.length > 0) {
          setErrors(headerErrors);
          setIsProcessing(false);
          return;
        }

        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const row: CSVRowData = {
            name: '',
            employeeNumber: '',
            depot: '',
            employmentType: '',
            skills: '',
            maxConsecutiveDays: '',
            monthlyHourLimit: '',
            specialNotes: ''
          };
          
          headers.forEach((header, i) => {
            if (header in row) {
              (row as Record<string, string>)[header] = values[i] || '';
            }
          });

          // データ検証
          const rowErrors: string[] = [];
          if (!row.name) rowErrors.push(`${index + 2}行目: 氏名が必須です`);
          if (!row.employeeNumber) rowErrors.push(`${index + 2}行目: 従業員番号が必須です`);
          if (!row.depot) rowErrors.push(`${index + 2}行目: 営業所が必須です`);
          if (!['full-time', 'part-time', 'contract'].includes(row.employmentType)) {
            rowErrors.push(`${index + 2}行目: 雇用形態は full-time, part-time, contract のいずれかである必要があります`);
          }

          if (rowErrors.length > 0) {
            setErrors(prev => [...prev, ...rowErrors]);
          }

          return {
            name: row.name,
            employeeNumber: row.employeeNumber,
            depot: row.depot,
            employmentType: row.employmentType as Employee['employmentType'],
            skills: row.skills ? row.skills.split(',').map((s: string) => s.trim()) : [],
            maxConsecutiveDays: parseInt(row.maxConsecutiveDays) || 5,
            monthlyHourLimit: parseInt(row.monthlyHourLimit) || 180,
            specialNotes: row.specialNotes,
            isActive: true
          };
        });

        setPreviewData(data);
        setIsProcessing(false);
      } catch (error) {
        setErrors(['CSVファイルの解析に失敗しました。ファイル形式を確認してください。']);
        setIsProcessing(false);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleUpload = () => {
    if (errors.length === 0 && previewData.length > 0) {
      onUpload(previewData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSVファイルアップロード
          </CardTitle>
          <CardDescription>
            従業員データをCSVファイルから一括登録できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              テンプレートダウンロード
            </Button>
            <div className="flex-1">
              <Label htmlFor="csvFile">CSVファイルを選択</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>
          </div>

          {isProcessing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ファイルを処理中です...
              </AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {previewData.length > 0 && errors.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {previewData.length}件のデータを読み込みました。プレビューを確認して登録してください。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>データプレビュー</CardTitle>
            <CardDescription>
              登録予定のデータを確認してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>氏名</TableHead>
                    <TableHead>従業員番号</TableHead>
                    <TableHead>営業所</TableHead>
                    <TableHead>雇用形態</TableHead>
                    <TableHead>スキル</TableHead>
                    <TableHead>連勤制限</TableHead>
                    <TableHead>月間時間上限</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.employeeNumber}</TableCell>
                      <TableCell>{row.depot}</TableCell>
                      <TableCell>{row.employmentType}</TableCell>
                      <TableCell>{row.skills.join(', ')}</TableCell>
                      <TableCell>{row.maxConsecutiveDays}日</TableCell>
                      <TableCell>{row.monthlyHourLimit}時間</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={errors.length > 0 || previewData.length === 0}
              >
                {previewData.length}件を登録
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}