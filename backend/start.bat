@echo off
chcp 65001 >nul
echo 🚀 启动化妆品安全API服务器...

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)

REM 检查npm是否安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm未安装，请先安装npm
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 📦 安装依赖包...
    npm install
)

echo 🔍 检查数据库连接...
node -e "const mysql = require('mysql2'); const db = mysql.createPool({host: '8.138.219.192', user: 'root', password: 'root', database: 'pet', acquireTimeout: 60000, timeout: 60000, reconnect: true}); db.getConnection((err, connection) => { if (err) { console.error('❌ 数据库连接失败:', err.message); process.exit(1); } else { console.log('✅ 数据库连接成功！'); connection.release(); process.exit(0); } });"

if %errorlevel% neq 0 (
    echo ❌ 数据库连接失败，请检查数据库配置
    pause
    exit /b 1
)

echo 🎯 启动API服务器...
echo 📡 服务器地址: http://8.138.219.192:8000
echo 🏥 健康检查: http://8.138.219.192:8000/api/health
echo.

echo 📦 启动Node.js服务...
node app.js

pause
