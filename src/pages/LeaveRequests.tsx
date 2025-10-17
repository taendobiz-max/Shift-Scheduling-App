import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Check, X, Clock } from 'lucide-react';
import { Employee, LeaveRequest } from '@/types';
import { mockEmployees, mockLeaveRequests } from '@/lib/mockData';

export default function LeaveRequests() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    type: 'annual' as LeaveRequest['type'],
    reason: '',
  });

  useEffect(() => {
    const storedEmployees = localStorage.getItem('employees');
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    } else {
      setEmployees(mockEmployees);
    }

    const storedRequests = localStorage.getItem('leaveRequests');
    if (storedRequests) {
      setLeaveRequests(JSON.parse(storedRequests));
    } else {
      setLeaveRequests(mockLeaveRequests);
      localStorage.setItem('leaveRequests', JSON.stringify(mockLeaveRequests));
    }
  }, []);

  const saveLeaveRequests = (requests: LeaveRequest[]) => {
    setLeaveRequests(requests);
    localStorage.setItem('leaveRequests', JSON.stringify(requests));
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: LeaveRequest = {
      id: Date.now().toString(),
      ...newRequest,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    const updatedRequests = [...leaveRequests, request];
    saveLeaveRequests(updatedRequests);
    
    setNewRequest({
      employeeId: '',
      startDate: '',
      endDate: '',
      type: 'annual',
      reason: '',
    });
    setIsDialogOpen(false);
  };

  const handleApproveRequest = (id: string) => {
    const updatedRequests = leaveRequests.map(request =>
      request.id === id
        ? {
            ...request,
            status: 'approved' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'manager',
          }
        : request
    );
    saveLeaveRequests(updatedRequests);
  };

  const handleRejectRequest = (id: string) => {
    const updatedRequests = leaveRequests.map(request =>
      request.id === id
        ? {
            ...request,
            status: 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'manager',
          }
        : request
    );
    saveLeaveRequests(updatedRequests);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : '不明';
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    const variants = {
      pending: 'default',
      approved: 'default',
      rejected: 'destructive'
    } as const;

    const labels = {
      pending: '承認待ち',
      approved: '承認済み',
      rejected: '却下'
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getLeaveTypeName = (type: LeaveRequest['type']) => {
    const types = {
      annual: '年次有給',
      sick: '病気休暇',
      personal: '私用休暇',
      compensatory: '代休'
    };
    return types[type];
  };

  const filteredRequests = leaveRequests.filter(request => 
    filterStatus === 'all' || request.status === filterStatus
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                休暇申請管理
              </CardTitle>
              <CardDescription>
                従業員の休暇申請の提出、承認、管理を行います
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新規申請
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>休暇申請</DialogTitle>
                  <DialogDescription>
                    休暇申請の詳細を入力してください
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">従業員 *</Label>
                    <Select value={newRequest.employeeId} onValueChange={(value) => setNewRequest(prev => ({ ...prev, employeeId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="従業員を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} ({employee.employeeNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">開始日 *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newRequest.startDate}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">終了日 *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newRequest.endDate}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">休暇種別 *</Label>
                    <Select value={newRequest.type} onValueChange={(value: LeaveRequest['type']) => setNewRequest(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">年次有給</SelectItem>
                        <SelectItem value="sick">病気休暇</SelectItem>
                        <SelectItem value="personal">私用休暇</SelectItem>
                        <SelectItem value="compensatory">代休</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">理由</Label>
                    <Textarea
                      id="reason"
                      value={newRequest.reason}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="休暇の理由を入力してください"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit">申請</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Label htmlFor="statusFilter">ステータス絞り込み:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="pending">承認待ち</SelectItem>
                <SelectItem value="approved">承認済み</SelectItem>
                <SelectItem value="rejected">却下</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>従業員名</TableHead>
                  <TableHead>休暇種別</TableHead>
                  <TableHead>期間</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>申請日</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {getEmployeeName(request.employeeId)}
                    </TableCell>
                    <TableCell>{getLeaveTypeName(request.type)}</TableCell>
                    <TableCell>
                      {request.startDate} 〜 {request.endDate}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(request.submittedAt).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproveRequest(request.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {request.status !== 'pending' && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {request.reviewedAt && new Date(request.reviewedAt).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {filterStatus === 'all' ? '休暇申請がありません' : `${filterStatus === 'pending' ? '承認待ちの' : filterStatus === 'approved' ? '承認済みの' : '却下された'}申請がありません`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}