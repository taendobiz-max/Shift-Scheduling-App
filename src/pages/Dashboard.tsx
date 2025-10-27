import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, FileText, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import EmployeeManagement from './EmployeeManagement';
import ShiftSchedule from './ShiftSchedule';
import LeaveRequests from './LeaveRequests';
import { mockEmployees, mockLeaveRequests, mockShifts } from '@/lib/mockData';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const pendingLeaveRequests = mockLeaveRequests.filter(req => req.status === 'pending').length;
  const activeEmployees = mockEmployees.filter(emp => emp.isActive).length;
  const todayShifts = mockShifts.filter(shift => shift.date === new Date().toISOString().split('T')[0]).length;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブ従業員</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">前月比 +2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日のシフト</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayShifts}</div>
            <p className="text-xs text-muted-foreground">予定通り運行中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認待ち休暇申請</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeaveRequests}</div>
            <p className="text-xs text-muted-foreground">要確認</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">制約違反</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">問題なし</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近の活動</CardTitle>
            <CardDescription>システムの最新の更新状況</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">シフト表が更新されました</p>
                <p className="text-xs text-muted-foreground">2時間前</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">新しい休暇申請が提出されました</p>
                <p className="text-xs text-muted-foreground">4時間前</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">従業員情報が更新されました</p>
                <p className="text-xs text-muted-foreground">1日前</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>今週の予定</CardTitle>
            <CardDescription>重要なイベントとタスク</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">月次シフト作成</p>
                <p className="text-xs text-muted-foreground">1月25日まで</p>
              </div>
              <Badge variant="outline">進行中</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">従業員研修</p>
                <p className="text-xs text-muted-foreground">1月20日</p>
              </div>
              <Badge variant="secondary">予定</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">システムメンテナンス</p>
                <p className="text-xs text-muted-foreground">1月30日</p>
              </div>
              <Badge variant="outline">予定</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">シフト管理システム</h1>
              <p className="text-sm text-gray-600">勤務シフト自動作成・管理システム</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Clock className="w-4 h-4 mr-2" />
                シフト生成
              </Button>
              <Button size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                レポート
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="employees">従業員管理</TabsTrigger>
            <TabsTrigger value="schedule">シフト表</TabsTrigger>
            <TabsTrigger value="leaves">休暇申請</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="schedule">
            <ShiftSchedule />
          </TabsContent>

          <TabsContent value="leaves">
            <LeaveRequests />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}