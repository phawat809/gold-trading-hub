#!/bin/bash
# สร้าง config.js จาก environment variables
# ใช้ตอน deploy บน Coolify หรือรันด้วย: source .env && bash build.sh

cat > config.js << EOF
const NOCODB_API_URL   = '${NOCODB_API_URL}';
const NOCODB_API_TOKEN = '${NOCODB_API_TOKEN}';
const NOCODB_TABLE_ID  = '${NOCODB_TABLE_ID}';
const SUPABASE_URL     = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
EOF

echo "✅ config.js created successfully"
