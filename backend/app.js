const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 环境变量
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';
const useNeon = isVercel || process.env.USE_NEON === 'true';

// 数据库连接配置
let db;

// 将 MySQL 风格 SQL 转换为 PostgreSQL 兼容形式（最小必要转换）
function convertMySQLToPostgresSql(originalSql) {
    if (!originalSql) return originalSql;

    let sql = originalSql;

    // GROUP_CONCAT(...) => STRING_AGG(..., ',')，支持 DISTINCT
    sql = sql.replace(/GROUP_CONCAT\(\s*(DISTINCT\s+)?([^\)]+)\)/gi, (match, distinct, expr) => {
        const distinctPart = distinct ? 'DISTINCT ' : '';
        return `STRING_AGG(${distinctPart}${expr.trim()}::text, ',')`;
    });

    return sql;
}

// 将 MySQL 的 ? 占位符转换为 $1, $2 ...（仅对 PostgreSQL 路径）
function convertPlaceholdersForPostgres(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

// NeonBase PostgreSQL 连接 (用于 Vercel 部署)
if (useNeon) {
    // 支持连接串与分字段配置
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.NEON_DB_URL;
    const neonConfig = connectionString
        ? {
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        }
        : {
            host: process.env.NEON_DB_HOST,
            port: process.env.NEON_DB_PORT || 5432,
            user: process.env.NEON_DB_USER,
            password: process.env.NEON_DB_PASSWORD,
            database: process.env.NEON_DB_NAME,
            ssl: process.env.NEON_DB_SSL === 'true' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        };

    const pgPool = new Pool(neonConfig);

    // 测试 PostgreSQL 连接
    pgPool.connect()
        .then(client => {
            console.log('✅ NeonBase PostgreSQL 连接成功！');
            const dbName = process.env.NEON_DB_NAME || (process.env.DATABASE_URL || '').split('/').pop() || 'postgres';
            console.log(`📊 连接到数据库: ${dbName}`);
            client.release();

            // 设置全局数据库对象为 PostgreSQL，并适配 mysql2 风格的返回值
            db = {
                query: (text, params, callback) => {
                    // 转换 SQL
                    let sql = convertMySQLToPostgresSql(text);
                    sql = convertPlaceholdersForPostgres(sql);

                    if (typeof params === 'function') {
                        callback = params;
                        params = undefined;
                    }

                    if (callback) {
                        return pgPool.query(sql, params, (err, result) => {
                            // 使返回值与 mysql2 对齐（数组）
                            callback(err, result ? result.rows : undefined);
                        });
                    } else {
                        return pgPool.query(sql, params).then(r => r.rows);
                    }
                },
                getConnection: (callback) => {
                    pgPool.connect((err, client, done) => {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, {
                            query: (text, params, cb) => {
                                let sql = convertMySQLToPostgresSql(text);
                                sql = convertPlaceholdersForPostgres(sql);
                                client.query(sql, params, (e, r) => cb(e, r ? r.rows : undefined));
                            },
                            release: () => done()
                        });
                    });
                }
            };
        })
        .catch(err => {
            console.error('❌ NeonBase PostgreSQL 连接失败:', err.message);
            console.log('⚠️ 尝试回退到 MySQL 连接...');
            setupMySQLConnection();
        });
} else {
    // 默认使用 MySQL 连接
    setupMySQLConnection();
}

// MySQL 连接设置函数
function setupMySQLConnection() {
    const mysqlConfig = {
        host: process.env.MYSQL_HOST || '8.138.219.192',
        user: process.env.MYSQL_USER || 'testmysql',
        password: process.env.MYSQL_PASSWORD || '5b5dc2099d696f50',
        database: process.env.MYSQL_DATABASE || 'testmysql',
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
    };
    
    const mysqlPool = mysql.createPool(mysqlConfig);
    
    // 测试 MySQL 连接
    mysqlPool.getConnection((err, connection) => {
        if (err) {
            console.error('❌ MySQL 数据库连接失败:', err.message);
        } else {
            console.log('✅ MySQL 数据库连接成功！');
            console.log(`📊 连接到数据库: ${mysqlConfig.database}`);
            console.log('📋 表名: cosmetic_notifications_cancelled');
            connection.release();
        }
    });
    
    // 设置全局数据库对象为 MySQL
    db = mysqlPool;
}

// 健康检查接口
app.get('/api/health', (req, res) => {
    db.query('SELECT COUNT(*) as total FROM cosmetic_notifications_cancelled', (err, result) => {
        if (err) {
            console.error('数据库查询错误:', err);
            res.status(500).json({
                status: 'error',
                database: 'disconnected',
                error: err.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                status: 'ok',
                database: 'connected',
                totalRecords: result[0].total,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// 获取所有被取消的化妆品通知（连接两张表）
app.get('/api/cosmetic_notifications_cancelled', (req, res) => {
    const limit = req.query.limit || 50; // 默认返回50条记录
    const offset = req.query.offset || 0;
    
    const query = `
        SELECT 
            cancelled.notif_no,
            cancelled.product,
            cancelled.holder,
            cancelled.manufacturer,
            cancelled.substance_detected,
            notifications.company,
            notifications.date_notif
        FROM cosmetic_notifications_cancelled cancelled
        LEFT JOIN cosmetic_notifications notifications 
        ON cancelled.notif_no = notifications.notif_no
        LIMIT ${limit} OFFSET ${offset}
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('数据库查询错误:', err);
            res.status(500).json({
                success: false,
                error: 'Database query failed',
                message: err.message
            });
        } else {
            res.json({
                success: true,
                data: result,
                total: result.length,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// 按产品名称搜索（连接两张表）
app.get('/api/search/product', (req, res) => {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
        return res.status(400).json({
            success: false,
            error: 'Search term is required',
            message: 'Please provide a search query parameter "q"'
        });
    }
    
    const query = `
        SELECT 
            cancelled.notif_no,
            cancelled.product,
            cancelled.holder,
            cancelled.manufacturer,
            cancelled.substance_detected,
            notifications.company,
            notifications.date_notif
        FROM cosmetic_notifications_cancelled cancelled
        LEFT JOIN cosmetic_notifications notifications 
        ON cancelled.notif_no = notifications.notif_no
        WHERE cancelled.product LIKE ? OR cancelled.holder LIKE ? OR notifications.company LIKE ?
        LIMIT 20
    `;
    
    db.query(
        query,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
        (err, result) => {
            if (err) {
                console.error('搜索查询错误:', err);
                res.status(500).json({
                    success: false,
                    error: 'Search query failed',
                    message: err.message
                });
            } else {
                res.json({
                    success: true,
                    data: result,
                    searchTerm: searchTerm,
                    total: result.length,
                    timestamp: new Date().toISOString()
                });
            }
        }
    );
});

// 按通知号搜索（搜索两张表）
app.get('/api/search/notification', (req, res) => {
    const notifNo = req.query.notif_no;
    
    if (!notifNo) {
        return res.status(400).json({
            success: false,
            error: 'Notification number is required',
            message: 'Please provide notification number parameter "notif_no"'
        });
    }
    
    // 首先搜索cancelled表
    const cancelledQuery = `
        SELECT 
            cancelled.notif_no,
            cancelled.product,
            cancelled.holder,
            cancelled.manufacturer,
            cancelled.substance_detected,
            notifications.company,
            notifications.date_notif,
            'cancelled' as status
        FROM cosmetic_notifications_cancelled cancelled
        LEFT JOIN cosmetic_notifications notifications 
        ON cancelled.notif_no = notifications.notif_no
        WHERE cancelled.notif_no LIKE ?
    `;
    
    // 然后搜索notifications表中不在cancelled表中的产品
    const approvedQuery = `
        SELECT 
            notifications.notif_no,
            notifications.product,
            NULL as holder,
            NULL as manufacturer,
            NULL as substance_detected,
            notifications.company,
            notifications.date_notif,
            'approved' as status
        FROM cosmetic_notifications notifications
        WHERE notifications.notif_no LIKE ? 
        AND notifications.notif_no NOT IN (
            SELECT notif_no FROM cosmetic_notifications_cancelled 
            WHERE notif_no IS NOT NULL
        )
        LIMIT 10
    `;
    
    db.query(cancelledQuery, [`%${notifNo}%`], (err1, cancelledResults) => {
        if (err1) {
            console.error('Cancelled table query error:', err1);
            res.status(500).json({
                success: false,
                error: 'Search failed',
                message: err1.message
            });
            return;
        }
        
        db.query(approvedQuery, [`%${notifNo}%`], (err2, approvedResults) => {
            if (err2) {
                console.error('Approved table query error:', err2);
                // 如果approved查询失败，仍然返回cancelled的结果
                res.json({
                    success: true,
                    data: cancelledResults,
                    notifNo: notifNo,
                    total: cancelledResults.length,
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            // 合并两个结果
            const combinedResults = [...cancelledResults, ...approvedResults];
            
            res.json({
                success: true,
                data: combinedResults,
                notifNo: notifNo,
                total: combinedResults.length,
                cancelled: cancelledResults.length,
                approved: approvedResults.length,
                timestamp: new Date().toISOString()
            });
        });
    });
});

// 获取所有化妆品通知信息（新表）
app.get('/api/cosmetic_notifications', (req, res) => {
    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;
    
    db.query(
        `SELECT * FROM cosmetic_notifications LIMIT ${limit} OFFSET ${offset}`, 
        (err, result) => {
            if (err) {
                console.error('数据库查询错误:', err);
                res.status(500).json({
                    success: false,
                    error: 'Database query failed',
                    message: err.message
                });
            } else {
                res.json({
                    success: true,
                    data: result,
                    total: result.length,
                    timestamp: new Date().toISOString()
                });
            }
        }
    );
});

// 测试两表连接查询
app.get('/api/test/join', (req, res) => {
    const query = `
        SELECT 
            cancelled.notif_no,
            cancelled.product,
            cancelled.holder,
            cancelled.manufacturer,
            cancelled.substance_detected,
            notifications.company,
            notifications.date_notif,
            CASE 
                WHEN notifications.notif_no IS NOT NULL THEN 'Found in both tables'
                ELSE 'Only in cancelled table'
            END as join_status
        FROM cosmetic_notifications_cancelled cancelled
        LEFT JOIN cosmetic_notifications notifications 
        ON cancelled.notif_no = notifications.notif_no
        LIMIT 10
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('连接查询错误:', err);
            res.status(500).json({
                success: false,
                error: 'Join query failed',
                message: err.message
            });
        } else {
            res.json({
                success: true,
                data: result,
                message: 'Join test completed',
                timestamp: new Date().toISOString()
            });
        }
    });
});

// 获取筛选统计信息（只返回数量，不返回具体数据）
app.get('/api/filter/statistics', (req, res) => {
    const queries = [
        // 总体统计
        `SELECT 
            COUNT(*) as total_notifications,
            'all_notifications' as category
         FROM cosmetic_notifications`,
        
        `SELECT 
            COUNT(*) as total_cancelled,
            'cancelled_products' as category
         FROM cosmetic_notifications_cancelled`,
        
        // 风险等级统计
        `SELECT 
            COUNT(*) as high_risk_count,
            'high_risk' as category
         FROM cosmetic_notifications_cancelled 
         WHERE substance_detected IS NOT NULL 
         AND (UPPER(substance_detected) LIKE '%MERCURY%' 
              OR UPPER(substance_detected) LIKE '%LEAD%' 
              OR UPPER(substance_detected) LIKE '%ARSENIC%' 
              OR UPPER(substance_detected) LIKE '%CADMIUM%')`,
        
        `SELECT 
            COUNT(*) as medium_risk_count,
            'medium_risk' as category
         FROM cosmetic_notifications_cancelled 
         WHERE substance_detected IS NOT NULL 
         AND (UPPER(substance_detected) LIKE '%HYDROQUINONE%' 
              OR UPPER(substance_detected) LIKE '%PARABENS%' 
              OR UPPER(substance_detected) LIKE '%FORMALDEHYDE%')`,
        
        // 成分统计
        `SELECT 
            COUNT(*) as mercury_free_count,
            'mercury_free' as category
         FROM cosmetic_notifications n
         WHERE n.notif_no NOT IN (
             SELECT c.notif_no FROM cosmetic_notifications_cancelled c 
             WHERE c.notif_no IS NOT NULL 
             AND UPPER(c.substance_detected) LIKE '%MERCURY%'
         )`,
        
        `SELECT 
            COUNT(*) as contains_harmful_count,
            'contains_harmful' as category
         FROM cosmetic_notifications_cancelled 
         WHERE substance_detected IS NOT NULL AND substance_detected != ''`
    ];
    
    const statistics = {};
    let completedQueries = 0;
    
    queries.forEach((query, index) => {
        db.query(query, (err, result) => {
            if (err) {
                console.error(`Statistics query ${index} error:`, err);
            } else if (result && result.length > 0) {
                const category = result[0].category;
                const count = Object.values(result[0])[0]; // 获取第一个数值字段
                statistics[category] = count;
            }
            
            completedQueries++;
            
            if (completedQueries === queries.length) {
                // 计算安全产品数量
                const totalNotifications = statistics.all_notifications || 0;
                const totalCancelled = statistics.cancelled_products || 0;
                const approvedCount = totalNotifications - totalCancelled;
                
                res.json({
                    success: true,
                    statistics: {
                        total_products: totalNotifications,
                        approved_products: approvedCount,
                        cancelled_products: totalCancelled,
                        low_risk: approvedCount, // 假设未取消的产品为低风险
                        medium_risk: statistics.medium_risk_count || 0,
                        high_risk: statistics.high_risk_count || 0,
                        mercury_free: statistics.mercury_free_count || 0,
                        contains_harmful: statistics.contains_harmful_count || 0
                    },
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
});

// 获取制造商统计信息（用于趋势页面饼图）
app.get('/api/manufacturer/statistics', (req, res) => {
    const query = `
        SELECT 
            manufacturer,
            COUNT(*) as violation_count,
            GROUP_CONCAT(DISTINCT substance_detected) as harmful_substances
        FROM cosmetic_notifications_cancelled 
        WHERE manufacturer IS NOT NULL AND manufacturer != ''
        GROUP BY manufacturer
        ORDER BY violation_count DESC
        LIMIT 20
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Manufacturer statistics query error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch manufacturer statistics',
                message: err.message
            });
            return;
        }

        // 计算总违规数和制造商数量
        const totalViolations = results.reduce((sum, item) => sum + item.violation_count, 0);
        const totalManufacturers = results.length;

        // 为饼图准备数据
        const chartData = results.map((item, index) => ({
            manufacturer: item.manufacturer,
            violations: item.violation_count,
            percentage: ((item.violation_count / totalViolations) * 100).toFixed(1),
            harmful_substances: item.harmful_substances ? item.harmful_substances.split(',') : [],
            color: generateColor(index)
        }));

        res.json({
            success: true,
            data: {
                manufacturers: chartData,
                summary: {
                    total_violations: totalViolations,
                    total_manufacturers: totalManufacturers,
                    top_violator: results[0] ? results[0].manufacturer : 'N/A',
                    most_violations: results[0] ? results[0].violation_count : 0
                }
            },
            timestamp: new Date().toISOString()
        });
    });
});

// 生成饼图颜色的辅助函数
function generateColor(index) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE',
        '#A3E4D7', '#F9E79F', '#D5A6BD', '#AED6F1', '#A9DFBF'
    ];
    return colors[index % colors.length];
}

// 根路径
app.get('/', (req, res) => {
    res.json({
        message: 'Product Safety API Server',
        status: 'running',
        endpoints: {
            health: '/api/health',
            cancelledData: '/api/cosmetic_notifications_cancelled',
            notificationsData: '/api/cosmetic_notifications',
            searchProduct: '/api/search/product?q=DELUXE',
            searchNotification: '/api/search/notification?notif_no=NOT200603276K',
            filterStatistics: '/api/filter/statistics',
            manufacturerStatistics: '/api/manufacturer/statistics',
            testJoin: '/api/test/join'
        },
        timestamp: new Date().toISOString()
    });
});

// 在 Vercel 上导出处理程序而不是监听端口
if (isVercel) {
    module.exports = app;
} else {
    // 本地或非 Vercel 环境启动服务器
    const port = process.env.PORT || 8000;
    const host = process.env.HOST || '0.0.0.0';
    app.listen(port, host, () => {
        console.log('');
        console.log('🚀 ===== 服务器启动成功 =====');
        console.log(`📡 服务器地址: http://${host}:${port}`);
        console.log(`🏥 健康检查: http://${host}:${port}/api/health`);
        console.log(`📊 获取取消数据: http://${host}:${port}/api/cosmetic_notifications_cancelled`);
        console.log(`📋 获取通知数据: http://${host}:${port}/api/cosmetic_notifications`);
        console.log(`🔍 搜索产品: http://${host}:${port}/api/search/product?q=DELUXE`);
        console.log(`🔢 搜索通知号: http://${host}:${port}/api/search/notification?notif_no=NOT200603276K`);
        console.log(`📈 筛选统计: http://${host}:${port}/api/filter/statistics`);
        console.log(`📊 制造商统计: http://${host}:${port}/api/manufacturer/statistics`);
        console.log(`🔗 测试表连接: http://${host}:${port}/api/test/join`);
        console.log('===============================');
    });
}