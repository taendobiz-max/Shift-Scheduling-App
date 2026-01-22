import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, BarChart3, Settings, Zap, UserX, LogOut, TrendingUp, Workflow, User, UserMinus, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logout, getCurrentUser } from '@/utils/auth';

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-12">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              シフト管理システム
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              効率的なシフト管理で、運行の安全性と従業員の働きやすさを実現
            </p>
          </div>
          <div className="absolute top-6 right-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{getCurrentUser()?.name}</span>
              <Link to="/profile">
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  マイページ
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
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


          <Link to="/reports">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2" />
                  勤務レポート
                </CardTitle>
                <CardDescription>
                  期間指定で勤務統計を集計
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  従業員ごとの勤務日数、勤務時間、休暇日数、手当回数を集計し、CSV出力ができます。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/unified-rules">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 hover:border-green-400">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Workflow className="h-6 w-6 mr-2" />
                  シフトルール管理
                </CardTitle>
                <CardDescription>
                  制約条件・ルールの統合管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  制約条件、フィルター、割り当てロジック、検証、最適化ルールを統合管理し、シフト生成を最適化できます。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/excluded-employees">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-orange-200 hover:border-orange-400">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-700">
                  <UserMinus className="h-6 w-6 mr-2" />
                  除外従業員管理
                </CardTitle>
                <CardDescription>
                  管理職・別業務メンバーの除外設定
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  管理職や別業務を持つメンバーをシフト自動生成時に除外する設定を管理します。拠点ごとに除外対象を指定できます。
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/incompatible-pairs">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-200 hover:border-purple-400">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700">
                  <UserX className="h-6 w-6 mr-2" />
                  相性ペア管理
                </CardTitle>
                <CardDescription>
                  相性の悪い従業員ペアの登録
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  相性の悪い従業員ペアを登録し、シフト自動生成時に同じ時間帯への配置を避けます。重要度を設定できます。
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/mobile-shift-view">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 hover:border-blue-400">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <Smartphone className="h-6 w-6 mr-2" />
                  シフト確認
                </CardTitle>
                <CardDescription>
                  スマートフォンに最適化されたシフト確認画面
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  勤務予定、残業時間、手当支給回数を簡単に確認できます。スマートフォンでの操作に最適化されています。
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

      </div>
    </div>
  );
}
