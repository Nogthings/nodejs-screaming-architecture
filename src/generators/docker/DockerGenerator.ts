// src/generators/docker/DockerGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';

export class DockerGenerator extends BaseFileGenerator {
    constructor() {
        super('docker');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        this.reset();

        if (!projectInfo.includeDocker) {
            console.log('⏭️ Skipping Docker generation (not enabled)');
            return;
        }

        console.log('🐳 Generating Docker configuration...');

        try {
            // Generate main Docker files
            await this.generateDockerfile(projectInfo, outputPath);
            await this.generateDockerCompose(projectInfo, outputPath);
            await this.generateDockerComposeDev(projectInfo, outputPath);
            await this.generateDockerIgnore(outputPath);
            
            // Generate database init scripts if needed
            if (projectInfo.database !== 'none') {
                await this.generateDatabaseScripts(projectInfo, outputPath);
            }
            
            // Generate utility scripts
            await this.generateMakefile(projectInfo, outputPath);
            await this.generateDevScript(projectInfo, outputPath);

            console.log('✅ Docker configuration generated');
        } catch (error) {
            this.errors.push(`Failed to generate Docker files: ${error}`);
            throw error;
        }
    }

    private async generateDockerfile(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        const dockerfileContent = `# Multi-stage build for ${projectInfo.name}
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install security updates and curl for health checks
RUN apk update && apk upgrade && apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Production dependencies stage
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage
FROM base AS dev-deps
RUN npm ci

# Build stage (if you add build steps later)
FROM dev-deps AS build
COPY . .
# RUN npm run build (uncomment if you add a build step)

# Production stage
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]

# Development stage
FROM dev-deps AS development

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Copy application code
COPY . .

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port and debug port
EXPOSE 3000 9229

# Start with development command
CMD ["npm", "run", "dev"]`;

        const dockerfilePath = path.join(outputPath, 'Dockerfile');
        await FileUtils.writeFile(dockerfilePath, dockerfileContent);
        this.filesCreated.push('Dockerfile');
        console.log('✅ Generated: Dockerfile');
    }

    private async generateDockerCompose(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        let composeContent = `version: '3.8'

name: ${projectInfo.name}

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: ${projectInfo.name}-app
    restart: unless-stopped
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - APP_NAME=${projectInfo.name}`;

        if (projectInfo.database !== 'none') {
            composeContent += `
    depends_on:
      - database
    networks:
      - app-network`;
            
            // Add database-specific environment variables
            composeContent += this.getDatabaseEnvironment(projectInfo);
        }

        // Add database service if needed
        if (projectInfo.database !== 'none') {
            composeContent += '\n\n' + this.getDatabaseService(projectInfo);
        }

        // Add networks and volumes
        if (projectInfo.database !== 'none') {
            composeContent += `

networks:
  app-network:
    driver: bridge

volumes:
  ${this.getDatabaseVolumeName(projectInfo.database)}:`;
        }

        const composePath = path.join(outputPath, 'docker-compose.yml');
        await FileUtils.writeFile(composePath, composeContent);
        this.filesCreated.push('docker-compose.yml');
        console.log('✅ Generated: docker-compose.yml');
    }

    private async generateDockerComposeDev(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        let composeContent = `version: '3.8'

name: ${projectInfo.name}-dev

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: ${projectInfo.name}-app-dev
    restart: unless-stopped
    ports:
      - "\${PORT:-3000}:3000"
      - "9229:9229"  # Node.js debug port
    environment:
      - NODE_ENV=development
      - APP_NAME=${projectInfo.name}
    volumes:
      - .:/app
      - /app/node_modules
      - app_logs:/app/logs`;

        if (projectInfo.database !== 'none') {
            composeContent += `
    depends_on:
      database:
        condition: service_healthy
    networks:
      - app-network`;
            
            // Add database-specific environment variables for development
            composeContent += this.getDatabaseEnvironment(projectInfo, true);
        }

        // Add database service for development
        if (projectInfo.database !== 'none') {
            composeContent += '\n\n' + this.getDatabaseService(projectInfo, true);
        }

        // Add networks and volumes
        composeContent += `

networks:`;
        
        if (projectInfo.database !== 'none') {
            composeContent += `
  app-network:
    driver: bridge`;
        }

        composeContent += `

volumes:
  app_logs:`;
        
        if (projectInfo.database !== 'none') {
            composeContent += `
  ${this.getDatabaseVolumeName(projectInfo.database)}_dev:`;
        }

        const composeDevPath = path.join(outputPath, 'docker-compose.dev.yml');
        await FileUtils.writeFile(composeDevPath, composeContent);
        this.filesCreated.push('docker-compose.dev.yml');
        console.log('✅ Generated: docker-compose.dev.yml');
    }

    private async generateDockerIgnore(outputPath: string): Promise<void> {
        const dockerignoreContent = `# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage
*.lcov
.nyc_output

# Build output
dist
build
out

# IDE files
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Documentation
README.md
docs/
*.md

# Test files
tests/
*.test.js
*.spec.js

# Temporary files
tmp/
temp/`;

        const dockerignorePath = path.join(outputPath, '.dockerignore');
        await FileUtils.writeFile(dockerignorePath, dockerignoreContent);
        this.filesCreated.push('.dockerignore');
        console.log('✅ Generated: .dockerignore');
    }

    private async generateDatabaseScripts(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        const dbType = projectInfo.database;
        const scriptsPath = path.join(outputPath, 'docker', dbType, 'init');

        switch (dbType) {
            case 'mongodb':
                await this.generateMongoInitScript(projectInfo, scriptsPath);
                break;
            case 'postgresql':
                await this.generatePostgresInitScript(projectInfo, scriptsPath);
                break;
            case 'mysql':
                await this.generateMysqlInitScript(projectInfo, scriptsPath);
                break;
        }
    }

    private async generateMongoInitScript(projectInfo: ProjectInfo, scriptsPath: string): Promise<void> {
        const initScript = `// MongoDB initialization script for ${projectInfo.name}
// This script runs when the MongoDB container starts for the first time

print('🚀 Initializing MongoDB for ${projectInfo.name}...');

// Switch to the application database
db = db.getSiblingDB('${projectInfo.name}');

// Create collections for each domain
${projectInfo.domains.map(domain => `print('📁 Creating collection: ${domain}');
db.createCollection('${domain}');`).join('\n')}

// Create indexes for better performance
${projectInfo.domains.map(domain => `print('🔍 Creating indexes for ${domain}...');
db.${domain}.createIndex({ "createdAt": 1 });
db.${domain}.createIndex({ "updatedAt": 1 });
db.${domain}.createIndex({ "name": 1 });`).join('\n')}

// Create a user for the application (optional)
/*
db.createUser({
  user: "${projectInfo.name}_user",
  pwd: "change_this_password",
  roles: [
    {
      role: "readWrite",
      db: "${projectInfo.name}"
    }
  ]
});
*/

print('✅ MongoDB initialization completed successfully!');`;

        const scriptPath = path.join(scriptsPath, '01-init.js');
        await FileUtils.writeFile(scriptPath, initScript);
        this.filesCreated.push(`docker/${projectInfo.database}/init/01-init.js`);
        console.log('✅ Generated: MongoDB init script');
    }

    private async generatePostgresInitScript(projectInfo: ProjectInfo, scriptsPath: string): Promise<void> {
        const initScript = `-- PostgreSQL initialization script for ${projectInfo.name}
-- This script runs when the PostgreSQL container starts for the first time

\\echo '🚀 Initializing PostgreSQL for ${projectInfo.name}...'

-- Create development database if it doesn't exist
SELECT 'CREATE DATABASE ${projectInfo.name}_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${projectInfo.name}_dev')\\gexec

-- Connect to the main database
\\c ${projectInfo.name};

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas for each domain
${projectInfo.domains.map(domain => `\\echo '📁 Creating schema: ${domain}'
CREATE SCHEMA IF NOT EXISTS ${domain};`).join('\n')}

-- Create tables for each domain
${projectInfo.domains.map(domain => {
    const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
    return `\\echo '📋 Creating table: ${domain}.${domain}'
CREATE TABLE IF NOT EXISTS ${domain}.${domain} (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add constraints
    CONSTRAINT ${domain}_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create indexes for ${domain}
CREATE INDEX IF NOT EXISTS idx_${domain}_created_at ON ${domain}.${domain}(created_at);
CREATE INDEX IF NOT EXISTS idx_${domain}_updated_at ON ${domain}.${domain}(updated_at);
CREATE INDEX IF NOT EXISTS idx_${domain}_name ON ${domain}.${domain}(name);`;
}).join('\n\n')}

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
${projectInfo.domains.map(domain => `CREATE TRIGGER set_timestamp_${domain}
    BEFORE UPDATE ON ${domain}.${domain}
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();`).join('\n')}

-- Create application user (optional)
/*
CREATE USER ${projectInfo.name}_user WITH PASSWORD 'change_this_password';
${projectInfo.domains.map(domain => `GRANT USAGE ON SCHEMA ${domain} TO ${projectInfo.name}_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${domain} TO ${projectInfo.name}_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${domain} TO ${projectInfo.name}_user;`).join('\n')}
*/

\\echo '✅ PostgreSQL initialization completed successfully!'`;

        const scriptPath = path.join(scriptsPath, '01-init.sql');
        await FileUtils.writeFile(scriptPath, initScript);
        this.filesCreated.push(`docker/${projectInfo.database}/init/01-init.sql`);
        console.log('✅ Generated: PostgreSQL init script');
    }

    private async generateMysqlInitScript(projectInfo: ProjectInfo, scriptsPath: string): Promise<void> {
        const initScript = `-- MySQL initialization script for ${projectInfo.name}
-- This script runs when the MySQL container starts for the first time

SELECT '🚀 Initializing MySQL for ${projectInfo.name}...' as message;

-- Create development database
CREATE DATABASE IF NOT EXISTS \`${projectInfo.name}_dev\`;

-- Use the main database
USE \`${projectInfo.name}\`;

-- Create tables for each domain
${projectInfo.domains.map(domain => {
    const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
    return `SELECT '📋 Creating table: ${domain}' as message;
CREATE TABLE IF NOT EXISTS \`${domain}\` (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add constraints
    CONSTRAINT \`${domain}_name_not_empty\` CHECK (CHAR_LENGTH(TRIM(name)) > 0),
    
    -- Add indexes
    INDEX \`idx_${domain}_created_at\` (created_at),
    INDEX \`idx_${domain}_updated_at\` (updated_at),
    INDEX \`idx_${domain}_name\` (name)
);`;
}).join('\n\n')}

-- Create application user (optional)
/*
CREATE USER IF NOT EXISTS '${projectInfo.name}_user'@'%' IDENTIFIED BY 'change_this_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${projectInfo.name}\`.* TO '${projectInfo.name}_user'@'%';
FLUSH PRIVILEGES;
*/

SELECT '✅ MySQL initialization completed successfully!' as message;`;

        const scriptPath = path.join(scriptsPath, '01-init.sql');
        await FileUtils.writeFile(scriptPath, initScript);
        this.filesCreated.push(`docker/${projectInfo.database}/init/01-init.sql`);
        console.log('✅ Generated: MySQL init script');
    }

    private async generateMakefile(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        const makefileContent = `# Makefile for ${projectInfo.name}
# This file provides convenient Docker commands

.PHONY: help build up down dev logs clean restart shell install test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \\033[36m%-15s\\033[0m %s\\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the Docker images
	@echo "🔨 Building Docker images..."
	docker-compose build

up: ## Start the services in production mode
	@echo "🚀 Starting production services..."
	docker-compose up -d

down: ## Stop and remove the services
	@echo "🛑 Stopping services..."
	docker-compose down

dev: ## Start the services in development mode
	@echo "🔧 Starting development services..."
	docker-compose -f docker-compose.dev.yml up

dev-build: ## Build and start in development mode
	@echo "🔨 Building and starting development services..."
	docker-compose -f docker-compose.dev.yml up --build

dev-down: ## Stop development services
	@echo "🛑 Stopping development services..."
	docker-compose -f docker-compose.dev.yml down

logs: ## Show logs from all services
	docker-compose logs -f

logs-app: ## Show logs from the app service only
	docker-compose logs -f app

${projectInfo.database !== 'none' ? `logs-db: ## Show logs from the database service
	docker-compose logs -f database` : ''}

clean: ## Remove all containers, networks, and volumes
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down -v --remove-orphans
	docker system prune -f

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	docker-compose restart

shell: ## Open a shell in the app container
	docker-compose exec app sh

${projectInfo.database !== 'none' ? `db-shell: ## Open a shell in the database container
	docker-compose exec database ${this.getDatabaseShellCommand(projectInfo.database, projectInfo.name)}` : ''}

install: ## Install dependencies inside the container
	docker-compose exec app npm install

test: ## Run tests inside the container
	docker-compose exec app npm test

status: ## Show status of all services
	docker-compose ps

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -f http://localhost:3000/health 2>/dev/null || echo "❌ App is not responding"
	@docker-compose ps

# Development helpers
dev-logs: ## Show development logs
	docker-compose -f docker-compose.dev.yml logs -f

dev-restart: ## Restart development services
	docker-compose -f docker-compose.dev.yml restart

dev-clean: ## Clean development environment
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans`;

        const makefilePath = path.join(outputPath, 'Makefile');
        await FileUtils.writeFile(makefilePath, makefileContent);
        this.filesCreated.push('Makefile');
        console.log('✅ Generated: Makefile');
    }

    private async generateDevScript(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        const scriptContent = `#!/bin/bash
# Quick development setup script for ${projectInfo.name}

set -e  # Exit on any error

echo "🚀 Starting ${projectInfo.name} development environment..."

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "\${RED}❌ Docker is not running. Please start Docker first.\${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "\${RED}❌ docker-compose is not installed. Please install docker-compose first.\${NC}"
    exit 1
fi

echo -e "\${BLUE}📦 Building Docker images...\${NC}"
docker-compose -f docker-compose.dev.yml build

echo -e "\${BLUE}🏃 Starting services...\${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo -e "\${YELLOW}⏳ Waiting for services to be ready...\${NC}"
sleep 10

${projectInfo.database !== 'none' ? `# Check database connection
echo -e "\${BLUE}🔍 Checking database connection...\${NC}"
case "${projectInfo.database}" in
    "mongodb")
        if docker-compose -f docker-compose.dev.yml exec -T database mongosh --eval "db.runCommand('ping')" ${projectInfo.name}_dev > /dev/null 2>&1; then
            echo -e "\${GREEN}✅ MongoDB is ready\${NC}"
        else
            echo -e "\${YELLOW}⚠️  MongoDB is still starting...\${NC}"
        fi
        ;;
    "postgresql")
        if docker-compose -f docker-compose.dev.yml exec -T database pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "\${GREEN}✅ PostgreSQL is ready\${NC}"
        else
            echo -e "\${YELLOW}⚠️  PostgreSQL is still starting...\${NC}"
        fi
        ;;
    "mysql")
        if docker-compose -f docker-compose.dev.yml exec -T database mysqladmin ping -uroot -pdevpassword > /dev/null 2>&1; then
            echo -e "\${GREEN}✅ MySQL is ready\${NC}"
        else
            echo -e "\${YELLOW}⚠️  MySQL is still starting...\${NC}"
        fi
        ;;
esac` : ''}

# Check if app is responding
echo -e "\${BLUE}🏥 Checking application health...\${NC}"
sleep 5

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "\${GREEN}✅ Application is ready!\${NC}"
else
    echo -e "\${YELLOW}⚠️  Application might still be starting...\${NC}"
fi

echo ""
echo -e "\${GREEN}✅ Development environment is ready!\${NC}"
echo ""
echo -e "\${BLUE}📱 Application URLs:\${NC}"
echo "   🏠 Main: http://localhost:3000"
echo "   📚 API: http://localhost:3000/api"
echo "   🏥 Health: http://localhost:3000/health"
${projectInfo.domains.map(domain => 
    `echo "   🔗 ${domain.charAt(0).toUpperCase() + domain.slice(1)}: http://localhost:3000/api/${domain}"`
).join('\n')}
echo ""
echo -e "\${BLUE}📋 Useful commands:\${NC}"
echo "   make logs         - Show all logs"
echo "   make logs-app     - Show app logs only"
${projectInfo.database !== 'none' ? `echo "   make logs-db      - Show database logs"` : ''}
echo "   make shell        - Open app shell"
${projectInfo.database !== 'none' ? `echo "   make db-shell     - Open database shell"` : ''}
echo "   make dev-down     - Stop services"
echo "   make clean        - Clean everything"
echo ""
echo -e "\${GREEN}🎉 Happy coding!\${NC}"

# Optional: Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi`;

        const scriptPath = path.join(outputPath, 'dev-start.sh');
        await FileUtils.writeFile(scriptPath, scriptContent);
        await FileUtils.makeExecutable(scriptPath);
        this.filesCreated.push('dev-start.sh');
        console.log('✅ Generated: dev-start.sh');
    }

    // Helper methods
    private getDatabaseEnvironment(projectInfo: ProjectInfo, isDev: boolean = false): string {
        const envSuffix = isDev ? '_dev' : '';
        const dbName = `${projectInfo.name}${envSuffix}`;
        
        switch (projectInfo.database) {
            case 'mongodb':
                return `
      - MONGODB_URI=mongodb://database:27017/${dbName}`;
            case 'postgresql':
                const password = isDev ? 'devpassword' : 'password';
                return `
      - DATABASE_URL=postgresql://postgres:${password}@database:5432/${dbName}
      - DB_HOST=database
      - DB_PORT=5432
      - DB_NAME=${dbName}
      - DB_USER=postgres
      - DB_PASSWORD=${password}`;
            case 'mysql':
                const mysqlPassword = isDev ? 'devpassword' : 'password';
                return `
      - DB_HOST=database
      - DB_PORT=3306
      - DB_NAME=${dbName}
      - DB_USER=root
      - DB_PASSWORD=${mysqlPassword}`;
            default:
                return '';
        }
    }

    private getDatabaseService(projectInfo: ProjectInfo, isDev: boolean = false): string {
        const envSuffix = isDev ? '_dev' : '';
        const dbName = `${projectInfo.name}${envSuffix}`;
        const volumeName = `${this.getDatabaseVolumeName(projectInfo.database)}${envSuffix}`;
        
        switch (projectInfo.database) {
            case 'mongodb':
                return `  database:
    image: mongo:7-jammy
    container_name: ${projectInfo.name}-mongodb${envSuffix}
    restart: unless-stopped
    ports:
      - "${isDev ? '27017:27017' : '27017:27017'}"
    environment:
      - MONGO_INITDB_DATABASE=${dbName}
    volumes:
      - ${volumeName}:/data/db
      - ./docker/mongodb/init:/docker-entrypoint-initdb.d:ro
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s`;

            case 'postgresql':
                const password = isDev ? 'devpassword' : 'password';
                return `  database:
    image: postgres:15-alpine
    container_name: ${projectInfo.name}-postgres${envSuffix}
    restart: unless-stopped
    ports:
      - "${isDev ? '5432:5432' : '5432:5432'}"
    environment:
      - POSTGRES_DB=${dbName}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${password}
    volumes:
      - ${volumeName}:/var/lib/postgresql/data
      - ./docker/postgresql/init:/docker-entrypoint-initdb.d:ro
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s`;

            case 'mysql':
                const mysqlPassword = isDev ? 'devpassword' : 'password';
                return `  database:
    image: mysql:8.0
    container_name: ${projectInfo.name}-mysql${envSuffix}
    restart: unless-stopped
    ports:
      - "${isDev ? '3306:3306' : '3306:3306'}"
    environment:
      - MYSQL_ROOT_PASSWORD=${mysqlPassword}
      - MYSQL_DATABASE=${dbName}
    volumes:
      - ${volumeName}:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d:ro
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${mysqlPassword}"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s`;

            default:
                return '';
        }
    }

    private getDatabaseVolumeName(database: string): string {
        switch (database) {
            case 'mongodb': return 'mongodb_data';
            case 'postgresql': return 'postgres_data';
            case 'mysql': return 'mysql_data';
            default: return 'db_data';
        }
    }

    private getDatabaseShellCommand(database: string, projectName: string): string {
        switch (database) {
            case 'mongodb': 
                return `mongosh ${projectName}`;
            case 'postgresql': 
                return `psql -U postgres -d ${projectName}`;
            case 'mysql': 
                return `mysql -uroot -ppassword ${projectName}`;
            default: 
                return 'sh';
        }
    }

    getCreatedFiles(): string[] {
        return [...this.filesCreated];
    }
}