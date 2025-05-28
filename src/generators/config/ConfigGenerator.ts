// src/generators/config/ConfigGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';

export class ConfigGenerator extends BaseFileGenerator {
    constructor() {
        super('config');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        this.reset();

        console.log('⚙️ Generating configuration files...');

        try {
            await this.generateDatabaseConfig(projectInfo, outputPath);
            await this.generateServerConfig(projectInfo, outputPath);
            await this.generateAppConfig(projectInfo, outputPath);
            
            console.log('✅ Configuration files generated');
        } catch (error) {
            this.errors.push(`Failed to generate config files: ${error}`);
            throw error;
        }
    }

    private async generateDatabaseConfig(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        const configPath = path.join(outputPath, 'config', 'database.js');
        let configContent = '';

        switch (projectInfo.database) {
            case 'mongodb':
                configContent = this.generateMongoConfig();
                break;
            case 'postgresql':
                configContent = this.generatePostgresConfig();
                break;
            case 'mysql':
                configContent = this.generateMysqlConfig();
                break;
            default:
                configContent = this.generateNoDatabaseConfig();
                break;
        }

        await FileUtils.writeFile(configPath, configContent);
        this.filesCreated.push('config/database.js');
        console.log('✅ Generated: config/database.js');
    }

    private generateMongoConfig(): string {
        return `const mongoose = require('mongoose');

/**
 * MongoDB Database Configuration
 */
class DatabaseConfig {
    constructor() {
        this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/defaultdb';
        this.options = {
            // Connection options
            maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            
            // Behavior options  
            bufferCommands: false,
            bufferMaxEntries: 0,
            
            // Authentication
            ...(process.env.MONGODB_USER && {
                auth: {
                    username: process.env.MONGODB_USER,
                    password: process.env.MONGODB_PASSWORD
                },
                authSource: process.env.MONGODB_AUTH_SOURCE || 'admin'
            })
        };
    }

    async connect() {
        try {
            console.log('🔌 Connecting to MongoDB...');
            
            const connection = await mongoose.connect(this.connectionString, this.options);
            
            console.log(\`✅ MongoDB connected: \${connection.connection.host}:\${connection.connection.port}\`);
            console.log(\`📊 Database: \${connection.connection.name}\`);
            
            // Set up connection event listeners
            this.setupEventListeners();
            
            return connection;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
            process.exit(1);
        }
    }

    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            console.log('🟢 MongoDB connected');
        });

        mongoose.connection.on('error', (error) => {
            console.error('🔴 MongoDB error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🟡 MongoDB disconnected');
        });

        // Handle app termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('👋 MongoDB connection closed through app termination');
            process.exit(0);
        });
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            console.log('👋 MongoDB connection closed');
        } catch (error) {
            console.error('❌ Error closing MongoDB connection:', error);
        }
    }

    getConnection() {
        return mongoose.connection;
    }

    isConnected() {
        return mongoose.connection.readyState === 1;
    }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = {
    connect: () => databaseConfig.connect(),
    disconnect: () => databaseConfig.disconnect(),
    getConnection: () => databaseConfig.getConnection(),
    isConnected: () => databaseConfig.isConnected()
};`;
    }

    private generatePostgresConfig(): string {
        return `const { Pool } = require('pg');

/**
 * PostgreSQL Database Configuration
 */
class DatabaseConfig {
    constructor() {
        this.config = {
            // Connection string (preferred) or individual options
            connectionString: process.env.DATABASE_URL,
            
            // Individual connection options (used if no connection string)
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'defaultdb',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            
            // Pool options
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            max: parseInt(process.env.DB_POOL_MAX) || 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            
            // SSL configuration
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };

        this.pool = new Pool(this.config);
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.pool.on('connect', (client) => {
            console.log(\`🟢 PostgreSQL client connected (PID: \${client.processID})\`);
        });

        this.pool.on('error', (error, client) => {
            console.error('🔴 PostgreSQL pool error:', error.message);
        });

        this.pool.on('remove', (client) => {
            console.log(\`🟡 PostgreSQL client removed (PID: \${client.processID})\`);
        });

        // Handle app termination
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    async connect() {
        try {
            console.log('🔌 Testing PostgreSQL connection...');
            
            const client = await this.pool.connect();
            const result = await client.query('SELECT version(), current_database(), current_user');
            
            console.log('✅ PostgreSQL connected successfully');
            console.log(\`📊 Database: \${result.rows[0].current_database}\`);
            console.log(\`👤 User: \${result.rows[0].current_user}\`);
            console.log(\`🏷️  Version: \${result.rows[0].version.split(' ').slice(0, 2).join(' ')}\`);
            
            client.release();
            return this.pool;
        } catch (error) {
            console.error('❌ PostgreSQL connection error:', error.message);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            await this.pool.end();
            console.log('👋 PostgreSQL pool closed');
        } catch (error) {
            console.error('❌ Error closing PostgreSQL pool:', error);
        }
    }

    getPool() {
        return this.pool;
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (process.env.NODE_ENV === 'development') {
                console.log(\`🔍 Query executed in \${duration}ms\`);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Query error:', error.message);
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = {
    connect: () => databaseConfig.connect(),
    disconnect: () => databaseConfig.disconnect(),
    getPool: () => databaseConfig.getPool(),
    query: (text, params) => databaseConfig.query(text, params),
    transaction: (callback) => databaseConfig.transaction(callback)
};`;
    }

    private generateMysqlConfig(): string {
        return `const mysql = require('mysql2/promise');

/**
 * MySQL Database Configuration
 */
class DatabaseConfig {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'defaultdb',
            
            // Pool configuration
            connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            
            // Connection options
            charset: process.env.DB_CHARSET || 'utf8mb4',
            timezone: 'Z',
            
            // SSL configuration
            ssl: process.env.NODE_ENV === 'production' ? {} : false,
            
            // Reconnection
            reconnect: true,
            
            // Handle disconnects
            handleDisconnects: true
        };

        this.pool = null;
        this.setupPool();
    }

    setupPool() {
        this.pool = mysql.createPool(this.config);
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.pool.on('connection', (connection) => {
            console.log(\`🟢 MySQL connection established (ID: \${connection.threadId})\`);
        });

        this.pool.on('error', (error) => {
            console.error('🔴 MySQL pool error:', error.message);
            
            if (error.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('🔄 Reconnecting to MySQL...');
                this.setupPool();
            } else {
                throw error;
            }
        });

        // Handle app termination
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    async connect() {
        try {
            console.log('🔌 Testing MySQL connection...');
            
            const connection = await this.pool.getConnection();
            const [rows] = await connection.execute('SELECT VERSION() as version, DATABASE() as database, USER() as user');
            
            console.log('✅ MySQL connected successfully');
            console.log(\`📊 Database: \${rows[0].database}\`);
            console.log(\`👤 User: \${rows[0].user}\`);
            console.log(\`🏷️  Version: \${rows[0].version}\`);
            
            connection.release();
            return this.pool;
        } catch (error) {
            console.error('❌ MySQL connection error:', error.message);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.end();
                console.log('👋 MySQL pool closed');
            }
        } catch (error) {
            console.error('❌ Error closing MySQL pool:', error);
        }
    }

    getPool() {
        return this.pool;
    }

    async query(sql, params) {
        const start = Date.now();
        try {
            const [rows, fields] = await this.pool.execute(sql, params);
            const duration = Date.now() - start;
            
            if (process.env.NODE_ENV === 'development') {
                console.log(\`🔍 Query executed in \${duration}ms\`);
            }
            
            return { rows, fields };
        } catch (error) {
            console.error('❌ Query error:', error.message);
            throw error;
        }
    }

    async transaction(callback) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = {
    connect: () => databaseConfig.connect(),
    disconnect: () => databaseConfig.disconnect(),
    getPool: () => databaseConfig.getPool(),
    query: (sql, params) => databaseConfig.query(sql, params),
    transaction: (callback) => databaseConfig.transaction(callback)
};`;
    }

    private generateNoDatabaseConfig(): string {
        return `/**
 * No Database Configuration
 * This project is configured without a database
 */

console.log('ℹ️  No database configuration - using in-memory storage');

module.exports = {
    connect: async () => {
        console.log('✅ In-memory storage ready');
        return Promise.resolve();
    },
    disconnect: async () => {
        console.log('👋 In-memory storage closed');
        return Promise.resolve();
    },
    isConnected: () => true
};`;
    }

    private async generateServerConfig(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        const serverConfigContent = `/**
 * Server Configuration for ${projectInfo.name}
 */

const config = {
    // Server settings
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    
    // API settings
    api: {
        prefix: process.env.API_PREFIX || '/api',
        version: process.env.API_VERSION || 'v1'
    },
    
    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
        allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization').split(','),
        credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    
    // Security settings
    security: {
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
        }
    },
    
    // Request/Response settings
    express: {
        jsonLimit: process.env.JSON_LIMIT || '10mb',
        urlencodedLimit: process.env.URLENCODED_LIMIT || '10mb',
        trustProxy: process.env.TRUST_PROXY === 'true'
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || null,
        format: process.env.LOG_FORMAT || 'combined'
    },
    
    // Session configuration (if needed)
    session: {
        secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
        }
    },
    
    // JWT configuration (if needed)
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        algorithm: 'HS256'
    },
    
    // Application-specific settings
    app: {
        name: process.env.APP_NAME || '${projectInfo.name}',
        version: process.env.APP_VERSION || '${projectInfo.version}',
        description: '${projectInfo.description}',
        author: '${projectInfo.author}'
    }
};

// Validation
function validateConfig() {
    const required = ['port'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        throw new Error(\`Missing required configuration: \${missing.join(', ')}\`);
    }
    
    if (config.env === 'production') {
        const productionRequired = ['jwt.secret', 'session.secret'];
        const productionMissing = productionRequired.filter(key => {
            const value = key.split('.').reduce((obj, prop) => obj[prop], config);
            return !value || value.includes('change-this') || value.includes('your-super-secret');
        });
        
        if (productionMissing.length > 0) {
            console.warn(\`⚠️  Production secrets should be changed: \${productionMissing.join(', ')}\`);
        }
    }
}

// Initialize and validate configuration
try {
    validateConfig();
    console.log(\`⚙️  Configuration loaded for \${config.env} environment\`);
} catch (error) {
    console.error('❌ Configuration error:', error.message);
    process.exit(1);
}

module.exports = config;`;

        const configPath = path.join(outputPath, 'config', 'server.js');
        await FileUtils.writeFile(configPath, serverConfigContent);
        this.filesCreated.push('config/server.js');
        console.log('✅ Generated: config/server.js');
    }

    private async generateAppConfig(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        const appConfigContent = `/**
 * Application Configuration for ${projectInfo.name}
 * This file contains application-specific configuration
 */

const config = {
    // Application metadata
    app: {
        name: '${projectInfo.name}',
        version: '${projectInfo.version}',
        description: '${projectInfo.description}',
        author: '${projectInfo.author}'
    },
    
    // Domain configuration
    domains: [
${projectInfo.domains.map(domain => `        {
            name: '${domain}',
            enabled: true,
            description: '${domain.charAt(0).toUpperCase() + domain.slice(1)} domain'
        }`).join(',\n')}
    ],
    
    // Features configuration
    features: {
        docker: ${projectInfo.includeDocker},
        tests: ${projectInfo.includeTests},
        database: '${projectInfo.database}',
        
        // Feature flags (can be controlled via environment variables)
        enableSwagger: process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV === 'development',
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        enableHealthChecks: true,
        enableRequestLogging: process.env.NODE_ENV === 'development'
    },
    
    // Business rules configuration
    business: {
        pagination: {
            defaultLimit: 10,
            maxLimit: 100
        },
        validation: {
            maxNameLength: 255,
            minNameLength: 1
        }
    },
    
    // External services configuration
    services: {
        // Email service
        email: {
            enabled: !!process.env.EMAIL_SERVICE_API_KEY,
            apiKey: process.env.EMAIL_SERVICE_API_KEY
        },
        
        // Payment gateway
        payment: {
            enabled: !!process.env.PAYMENT_GATEWAY_KEY,
            apiKey: process.env.PAYMENT_GATEWAY_KEY
        },
        
        // Notification service
        notifications: {
            enabled: !!process.env.NOTIFICATION_SERVICE_URL,
            url: process.env.NOTIFICATION_SERVICE_URL
        }
    }
};

/**
 * Get domain configuration by name
 */
function getDomainConfig(domainName) {
    return config.domains.find(domain => domain.name === domainName);
}

/**
 * Check if a feature is enabled
 */
function isFeatureEnabled(featureName) {
    return config.features[featureName] === true;
}

/**
 * Get business rule configuration
 */
function getBusinessRule(ruleName) {
    return config.business[ruleName];
}

/**
 * Check if an external service is configured and enabled
 */
function isServiceEnabled(serviceName) {
    const service = config.services[serviceName];
    return service && service.enabled;
}

module.exports = {
    ...config,
    getDomainConfig,
    isFeatureEnabled,
    getBusinessRule,
    isServiceEnabled
};`;

        const configPath = path.join(outputPath, 'config', 'app.js');
        await FileUtils.writeFile(configPath, appConfigContent);
        this.filesCreated.push('config/app.js');
        console.log('✅ Generated: config/app.js');
    }

    getCreatedFiles(): string[] {
        return [...this.filesCreated];
    }
}