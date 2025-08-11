#!/bin/bash

# 化妆品安全API服务器启动脚本
# 适用于服务器部署

echo "🚀 启动化妆品安全API服务器..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 检查MySQL连接
echo "🔍 检查数据库连接..."
node -e "
const mysql = require('mysql2');
const db = mysql.createPool({
    host: '8.138.219.192',
    user: 'root',
    password: 'root',
    database: 'pet',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err.message);
        process.exit(1);
    } else {
        console.log('✅ 数据库连接成功！');
        connection.release();
        process.exit(0);
    }
});
"

if [ $? -ne 0 ]; then
    echo "❌ 数据库连接失败，请检查数据库配置"
    exit 1
fi

# 启动服务器
echo "🎯 启动API服务器..."
echo "📡 服务器地址: http://8.138.219.192:8000"
echo "🏥 健康检查: http://8.138.219.192:8000/api/health"
echo ""

# 使用PM2启动（如果安装了PM2）
if command -v pm2 &> /dev/null; then
    echo "📦 使用PM2启动服务..."
    pm2 start app.js --name "cosmetic-safety-api"
    pm2 save
    echo "✅ 服务已启动，使用 'pm2 logs cosmetic-safety-api' 查看日志"
    echo "🔄 使用 'pm2 restart cosmetic-safety-api' 重启服务"
else
    echo "📦 直接启动Node.js服务..."
    node app.js
fi
