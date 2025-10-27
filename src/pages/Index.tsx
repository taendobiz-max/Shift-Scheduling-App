import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, BarChart3, Settings, Zap, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-12">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            シフト管理システム
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            効率的なシフト管理で、運行の安全性と従業員の働きやすさを実現
          </p>
        </div>

        {/* メイン機能カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link to="/shift-generator">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 hover:border-blue-400">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <Zap className="h-6 w-6 mr-2" />
                  シフト自動生成
                </CardTitle>
                <CardDescription>
                  AIを活用した効率的なシフト作成
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  期間を指定するだけで、最適なシフトを自動生成します。従業員の勤務条件や法的制約を考慮した安全なシフト作成が可能です。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/shift-schedule">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-6 w-6 mr-2" />
                  シフト管理
                </CardTitle>
                <CardDescription>
                  シフトの確認・編集・調整
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  生成されたシフトの確認、個別調整、緊急時の変更対応など、柔軟なシフト管理機能を提供します。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/vacation-management">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-200 hover:border-red-400">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <UserX className="h-6 w-6 mr-2" />
                  休暇管理
                </CardTitle>
                <CardDescription>
                  従業員の休暇登録・管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  管理者が従業員の休暇を事前登録し、シフト生成時に自動反映。効率的な休暇管理を実現します。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/employees">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-6 w-6 mr-2" />
                  従業員管理
                </CardTitle>
                <CardDescription>
                  従業員情報の登録・管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  従業員の基本情報、勤務条件、スキル情報を一元管理。シフト作成の基盤となるデータを効率的に管理できます。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/master-data">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-6 w-6 mr-2" />
                  マスタデータ管理
                </CardTitle>
                <CardDescription>
                  基本設定とマスタデータ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  路線、車両、勤務パターンなどの基本データを管理。システム全体の設定を一元化できます。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/skill-matrix">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-6 w-6 mr-2" />
                  スキル管理
                </CardTitle>
                <CardDescription>
                  従業員のスキル・資格管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  運転免許、路線資格、特殊技能などを管理。適切な人員配置とスキル向上をサポートします。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-500">
                <Clock className="h-6 w-6 mr-2" />
                レポート機能
              </CardTitle>
              <CardDescription>
                各種統計・分析レポート（開発予定）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                勤務時間統計、コスト分析、効率性レポートなど、経営判断に必要な情報を提供予定です。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">クイックアクション</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/shift-generator">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Zap className="h-4 w-4 mr-2" />
                今すぐシフト生成
              </Button>
            </Link>
            <Link to="/vacation-management">
              <Button className="bg-red-600 hover:bg-red-700">
                <UserX className="h-4 w-4 mr-2" />
                休暇登録
              </Button>
            </Link>
            <Link to="/employees">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                従業員登録
              </Button>
            </Link>
            <Link to="/shift-schedule">
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                シフト確認
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}