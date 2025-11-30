import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, Download, Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { Link } from 'react-router-dom';

interface Employee {
  employee_id: string;
  name: string;
  office: string;
}

interface ShiftRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  business_name: string;
}

interface LeaveRecord {
  employee_id: string;
  leave_date: string;
  leave_type: string;
}

interface EmployeeReport {
  employee_id: string;
  employee_name: string;
  office: string;
  work_days: number;
  work_hours: number;
  leave_days: number;
  allowance_count: number;
}

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('期間を指定してください');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('開始日は終了日より前にしてください');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('employee_id, name, office')
        .order('name');

      if (empError) throw empError;

      // Fetch shifts in the date range
      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (shiftError) throw shiftError;

      // Fetch leave requests in the date range
      const { data: leaves, error: leaveError } = await supabase
        .from('leave_requests')
        .select('employee_id, leave_date, leave_type')
        .gte('leave_date', startDate)
        .lte('leave_date', endDate)
        .eq('status', 'approved');

      if (leaveError) throw leaveError;

      // Calculate statistics for each employee
      const employeeReports: EmployeeReport[] = (employees || []).map((emp: Employee) => {
        const empShifts = (shifts || []).filter((s: ShiftRecord) => s.employee_id === emp.employee_id);
        const empLeaves = (leaves || []).filter((l: LeaveRecord) => l.employee_id === emp.employee_id);

        // Calculate work days (unique dates)
        const workDays = new Set(empShifts.map((s: ShiftRecord) => s.date)).size;

        // Calculate total work hours
        const workHours = empShifts.reduce((total: number, shift: ShiftRecord) => {
          const start = new Date(`2000-01-01T${shift.start_time}`);
          const end = new Date(`2000-01-01T${shift.end_time}`);
          let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          
          // Handle overnight shifts
          if (hours < 0) {
            hours += 24;
          }
          
          return total + hours;
        }, 0);

        // Calculate leave days
        const leaveDays = empLeaves.length;

        // Calculate allowance count (shifts with specific keywords)
        const allowanceCount = empShifts.filter((s: ShiftRecord) => {
          const businessName = s.business_name || '';
          return businessName.includes('深夜') || 
                 businessName.includes('早朝') || 
                 businessName.includes('休日');
        }).length;

        return {
          employee_id: emp.employee_id,
          employee_name: emp.name,
          office: emp.office,
          work_days: workDays,
          work_hours: Math.round(workHours * 10) / 10,
          leave_days: leaveDays,
          allowance_count: allowanceCount
        };
      });

      setReports(employeeReports);
      toast.success('レポートを生成しました');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('レポート生成中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reports.length === 0) {
      toast.error('レポートを生成してください');
      return;
    }

    const headers = ['従業員ID', '従業員名', '拠点', '勤務日数', '勤務時間', '休暇日数', '手当回数'];
    const rows = reports.map(r => [
      r.employee_id,
      r.employee_name,
      r.office,
      r.work_days,
      r.work_hours,
      r.leave_days,
      r.allowance_count
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `勤務レポート_${startDate}_${endDate}.csv`;
    link.click();

    toast.success('CSVファイルをダウンロードしました');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">勤務レポート</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            ホーム
          </Button>
        </Link>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            集計期間
          </CardTitle>
          <CardDescription>レポートを生成する期間を指定してください</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">開始日</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">終了日</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button onClick={generateReport} disabled={isLoading}>
                <TrendingUp className="h-4 w-4 mr-2" />
                {isLoading ? '生成中...' : 'レポート生成'}
              </Button>
              <Button onClick={exportToCSV} variant="outline" disabled={reports.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                CSV出力
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">総従業員数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{reports.length}名</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">総勤務日数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">
                  {reports.reduce((sum, r) => sum + r.work_days, 0)}日
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">総勤務時間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-2xl font-bold">
                  {Math.round(reports.reduce((sum, r) => sum + r.work_hours, 0) * 10) / 10}時間
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">総休暇日数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span className="text-2xl font-bold">
                  {reports.reduce((sum, r) => sum + r.leave_days, 0)}日
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Table */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>従業員別勤務統計</CardTitle>
            <CardDescription>
              {startDate} 〜 {endDate} の期間
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>従業員名</TableHead>
                    <TableHead>拠点</TableHead>
                    <TableHead className="text-right">勤務日数</TableHead>
                    <TableHead className="text-right">勤務時間</TableHead>
                    <TableHead className="text-right">休暇日数</TableHead>
                    <TableHead className="text-right">手当回数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.employee_id}>
                      <TableCell className="font-medium">{report.employee_name}</TableCell>
                      <TableCell>{report.office}</TableCell>
                      <TableCell className="text-right">{report.work_days}日</TableCell>
                      <TableCell className="text-right">{report.work_hours}時間</TableCell>
                      <TableCell className="text-right">{report.leave_days}日</TableCell>
                      <TableCell className="text-right">{report.allowance_count}回</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {reports.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>期間を指定してレポートを生成してください</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
