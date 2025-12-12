#!/bin/bash
echo "🔧 Fixing Supabase connection..."

# .envファイルを環境変数として読み込むようにsupabaseClient.tsを修正
cat > supabaseClient.ts << 'EOFCLIENT'
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://vipsfjdsspkczumuqnoi.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcHNmamRzc3BrY3p1bXVxbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjM3MzEsImV4cCI6MjA3MjUzOTczMX0.kgAMk7sS_ZCHjkMSQxhQulPs0xmA8B9vhNRlDV5jhU8';

console.log('🔗 Initializing Supabase client...' );
console.log('📍 Supabase URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
EOFCLIENT

echo "✅ Updated supabaseClient.ts"

# dotenvパッケージをインストール
npm install dotenv

# 再コンパイル
npx tsc supabaseClient.ts

# APIサーバーを再起動
pm2 restart api-server

echo "✅ Done! Checking logs..."
sleep 2
pm2 logs api-server --lines 30 | grep -E "Supabase|skill_matrix|点呼|PHASE"

