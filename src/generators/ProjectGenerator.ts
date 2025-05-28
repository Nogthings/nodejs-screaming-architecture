// src/generators/ProjectGenerator.ts
import * as path from 'path';
import { ProjectInfo } from '../types/ProjectInfo';
import { FileUtils } from '../utils/fileUtils';

// Generators
import { PackageJsonGenerator } from './base/PackageJsonGenerator';
import { DomainGenerator } from './domain/DomainGenerator';
import { DockerGenerator } from './docker/DockerGenerator';
import { ConfigGenerator } from './config/ConfigGenerator';

export class ProjectGenerator {
    private packageJsonGenerator: PackageJsonGenerator;
    private domainGenerator: DomainGenerator;
    private dockerGenerator: DockerGenerator;
    private configGenerator: ConfigGenerator;

    constructor() {
        this.packageJsonGenerator = new PackageJsonGenerator();
        this.domainGenerator = new DomainGenerator();
        this.dockerGenerator = new DockerGenerator();
        this.configGenerator = new ConfigGenerator();
    }

    /**
     * Genera un proyecto completo
     */
    async generateProject(projectInfo: ProjectInfo, basePath: string): Promise<void> {
        const projectPath = path.join(basePath, projectInfo.name);

        console.log(`🚀 Generating project: ${projectInfo.name}`);
        console.log(`📍 Location: ${projectPath}`);

        try {
            // 1. Crear estructura de directorios
            await this.createProjectStructure(projectPath, projectInfo);

            // 2. Generar archivos base
            await this.generateBaseFiles(projectInfo, projectPath);

            // 3. Generar dominios
            await this.domainGenerator.generate(projectInfo, projectPath);

            // 4. Generar configuración
            await this.configGenerator.generate(projectInfo, projectPath);

            // 5. Generar Docker si está habilitado
            if (projectInfo.includeDocker) {
                await this.dockerGenerator.generate(projectInfo, projectPath);
            }

            // 6. Generar archivos adicionales
            await this.generateAdditionalFiles(projectInfo, projectPath);

            console.log(`✅ Project ${projectInfo.name} generated successfully!`);
            console.log(`📚 Run these commands to get started:`);
            console.log(`   cd ${projectInfo.name}`);
            console.log(`   npm install`);
            console.log(`   npm run dev`);

        } catch (error) {
            console.error(`❌ Failed to generate project: ${error}`);
            throw error;
        }
    }

    /**
     * Crea la estructura básica de directorios
     */
    private async createProjectStructure(projectPath: string, projectInfo: ProjectInfo): Promise<void> {
        console.log('📁 Creating project structure...');

        const directories = [
            // Base directories
            'src',
            'src/shared',
            'src/shared/domain',
            'src/shared/domain/events',
            'src/shared/domain/value-objects',
            'src/shared/infrastructure',
            'src/shared/infrastructure/database',
            'src/shared/infrastructure/messaging',
            'src/shared/infrastructure/logging',
            'src/shared/application',
            'src/shared/application/middlewares',
            'config',
            'docs'
        ];

        // Add test directories if needed
        if (projectInfo.includeTests) {
            directories.push(
                'tests',
                'tests/unit',
                'tests/integration',
                'tests/e2e'
            );
        }

        // Add Docker directories if needed
        if (projectInfo.includeDocker) {
            directories.push('docker');
            
            if (projectInfo.database !== 'none') {
                directories.push(`docker/${projectInfo.database}`);
                directories.push(`docker/${projectInfo.database}/init`);
            }
        }

        // Create domain directories
        for (const domain of projectInfo.domains) {
            const domainDirs = [
                `src/${domain}`,
                `src/${domain}/application`,
                `src/${domain}/application/services`,
                `src/${domain}/application/use-cases`,
                `src/${domain}/application/ports`,
                `src/${domain}/domain`,
                `src/${domain}/domain/entities`,
                `src/${domain}/domain/value-objects`,
                `src/${domain}/domain/events`,
                `src/${domain}/infrastructure`,
                `src/${domain}/infrastructure/repositories`,
                `src/${domain}/infrastructure/controllers`,
                `src/${domain}/infrastructure/adapters`
            ];

            directories.push(...domainDirs);

            // Add test directories for each domain
            if (projectInfo.includeTests) {
                directories.push(
                    `tests/${domain}`,
                    `tests/${domain}/unit`,
                    `tests/${domain}/integration`
                );
            }
        }

        await FileUtils.createDirectories(projectPath, directories);
        console.log(`✅ Created ${directories.length} directories`);
    }

    /**
     * Genera archivos base del proyecto
     */
    private async generateBaseFiles(projectInfo: ProjectInfo, projectPath: string): Promise<void> {
        console.log('📄 Generating base files...');

        // Generate package.json
        await this.packageJsonGenerator.generate(projectInfo, projectPath);

        // Generate server.js
        await this.generateServerFile(projectInfo, projectPath);

        // Generate README.md
        await this.generateReadmeFile(projectInfo, projectPath);

        // Generate .env files
        await this.generateEnvFiles(projectInfo, projectPath);

        // Generate .gitignore
        await this.generateGitIgnore(projectPath);

        console.log('✅ Base files generated');
    }

    /**
     * Genera el archivo server.js principal
     */
    private async generateServerFile(projectInfo: ProjectInfo, projectPath: string): Promise<void> {
        const serverContent = `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.originalUrl}\`);
        next();
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: '${projectInfo.name}',
        version: '${projectInfo.version}',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});

// API routes
${projectInfo.domains.map(domain => {
    return `const ${domain}Routes = require('./src/${domain}/infrastructure/routes');
app.use('/api/${domain}', ${domain}Routes);`;
}).join('\n')}

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: '${projectInfo.name}',
        description: '${projectInfo.description}',
        version: '${projectInfo.version}',
        domains: [
${projectInfo.domains.map(domain => `            {
                name: '${domain}',
                endpoints: [
                    'GET /api/${domain}/health',
                    'POST /api/${domain}',
                    'GET /api/${domain}',
                    'GET /api/${domain}/:id',
                    'PUT /api/${domain}/:id',
                    'DELETE /api/${domain}/:id'
                ]
            }`).join(',\n')}
        ],
        links: {
            health: '/health',
${projectInfo.domains.map(domain => `            ${domain}: '/api/${domain}'`).join(',\n')}
        }
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    res.status(err.status || 500).json({ 
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            path: req.path,
            method: req.method
        })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND',
        path: req.originalUrl,
        method: req.method,
        availableRoutes: {
            health: 'GET /health',
            api: 'GET /api',
${projectInfo.domains.map(domain => `            ${domain}: 'GET /api/${domain}/health'`).join(',\n')}
        },
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

const server = app.listen(PORT, () => {
    console.log(\`🚀 Server running on port \${PORT}\`);
    console.log(\`📚 API Documentation: http://localhost:\${PORT}/api\`);
    console.log(\`🏥 Health Check: http://localhost:\${PORT}/health\`);
    console.log(\`📱 Available domains:\`);
${projectInfo.domains.map(domain => `    console.log(\`   - ${domain.charAt(0).toUpperCase() + domain.slice(1)}: http://localhost:\${PORT}/api/${domain}\`);`).join('\n')}
    console.log(\`🌍 Environment: \${process.env.NODE_ENV || 'development'}\`);
});

module.exports = app;`;

        const serverPath = path.join(projectPath, 'src', 'server.js');
        await FileUtils.writeFile(serverPath, serverContent);
        console.log('✅ Generated: src/server.js');
    }

    /**
     * Genera el archivo README.md
     */
    private async generateReadmeFile(projectInfo: ProjectInfo, projectPath: string): Promise<void> {
        const readmeContent = `# ${projectInfo.name}

${projectInfo.description}

## 🏗️ Architecture

This project follows **Screaming Architecture** and **Domain-Driven Design (DDD)** principles.

### Project Structure

\`\`\`
src/
${projectInfo.domains.map(domain => `├── ${domain}/              # ${domain.charAt(0).toUpperCase() + domain.slice(1)} domain
│   ├── application/      # Use cases and services
│   ├── domain/          # Business logic
│   └── infrastructure/  # External concerns`).join('\n')}
└── shared/              # Shared code across domains
\`\`\`

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
${projectInfo.database !== 'none' ? `- ${projectInfo.database.charAt(0).toUpperCase() + projectInfo.database.slice(1)} database` : ''}

### Installation

\`\`\`bash
# Clone the repository
git clone <your-repo-url>
cd ${projectInfo.name}

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
# nano .env
\`\`\`

### Development

\`\`\`bash
# Start development server
npm run dev

# Start production server
npm start
\`\`\`

${projectInfo.includeDocker ? `### Docker Development

\`\`\`bash
# Quick start with Docker
./dev-start.sh

# Or manually
docker-compose -f docker-compose.dev.yml up --build

# Production with Docker
docker-compose up --build -d
\`\`\`

### Available Make Commands

\`\`\`bash
make help        # Show all available commands
make dev         # Start development environment
make build       # Build Docker images
make up          # Start production environment
make down        # Stop all services
make logs        # Show application logs
make clean       # Remove all containers and volumes
\`\`\`
` : ''}

## 📚 API Documentation

### Base URL
- Development: \`http://localhost:3000\`
- Production: \`<your-production-url>\`

### Global Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/health\` | Health check |
| GET | \`/api\` | API documentation |

### Domain Endpoints

${projectInfo.domains.map(domain => `#### ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/${domain}/health\` | Domain health check |
| POST | \`/api/${domain}\` | Create ${domain} |
| GET | \`/api/${domain}\` | Get all ${domain}s |
| GET | \`/api/${domain}/:id\` | Get ${domain} by ID |
| PUT | \`/api/${domain}/:id\` | Update ${domain} |
| DELETE | \`/api/${domain}/:id\` | Delete ${domain} |

**Example requests:**

\`\`\`bash
# Create ${domain}
curl -X POST http://localhost:3000/api/${domain} \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Example ${domain}"}'

# Get all ${domain}s
curl http://localhost:3000/api/${domain}

# Get ${domain} by ID
curl http://localhost:3000/api/${domain}/123
\`\`\`
`).join('\n\n')}

## 🏗️ Architecture Details

### Domains

${projectInfo.domains.map(domain => `#### ${domain.charAt(0).toUpperCase() + domain.slice(1)}
- **Entities**: Core business objects
- **Use Cases**: Application business rules
- **Services**: Domain services
- **Repositories**: Data access interfaces
- **Controllers**: HTTP request handlers`).join('\n\n')}

### Shared Components

- **Domain Events**: Cross-domain communication
- **Value Objects**: Reusable value types
- **Infrastructure**: Database, logging, messaging
- **Middlewares**: Common request processing

## 🌟 Features

- ✅ Clean Architecture (Screaming Architecture)
- ✅ Domain-Driven Design (DDD)
- ✅ Express.js REST API
- ✅ Environment-based configuration
- ✅ Comprehensive error handling
- ✅ Request/Response logging
- ✅ API documentation
- ✅ Health checks
${projectInfo.includeDocker ? '- ✅ Docker support with multi-stage builds' : ''}
${projectInfo.includeTests ? '- ✅ Testing setup (Jest + Supertest)' : ''}
${projectInfo.database !== 'none' ? `- ✅ ${projectInfo.database.charAt(0).toUpperCase() + projectInfo.database.slice(1)} database integration` : ''}
- ✅ CORS and Security headers
- ✅ Graceful shutdown handling

## 🧪 Testing

${projectInfo.includeTests ? `\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`` : 'Testing is not configured. To add testing, install Jest and Supertest.'}

## 📝 Scripts

| Script | Description |
|--------|-------------|
| \`npm start\` | Start production server |
| \`npm run dev\` | Start development server with nodemon |
${projectInfo.includeTests ? '| `npm test` | Run tests |\n| `npm run test:watch` | Run tests in watch mode |\n| `npm run test:coverage` | Run tests with coverage |' : ''}

## 🔧 Configuration

Environment variables are managed through \`.env\` files:

- \`.env.example\` - Template with all available variables
- \`.env\` - Your local configuration (not committed to git)

### Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`NODE_ENV\` | Environment mode | \`development\` |
| \`PORT\` | Server port | \`3000\` |
| \`APP_NAME\` | Application name | \`${projectInfo.name}\` |
${projectInfo.database !== 'none' ? this.getDatabaseEnvDocs(projectInfo.database, projectInfo.name) : ''}

${projectInfo.database !== 'none' ? `## 🗄️ Database

This project uses ${projectInfo.database.charAt(0).toUpperCase() + projectInfo.database.slice(1)} as the database.

### Setup

${this.getDatabaseSetupDocs(projectInfo.database, projectInfo.name)}
` : ''}

## 📦 Project Structure

\`\`\`
${projectInfo.name}/
├── src/
│   ├── server.js                 # Application entry point
${projectInfo.domains.map(domain => `│   ├── ${domain}/
│   │   ├── application/          # Use cases, services, ports
│   │   ├── domain/              # Entities, value objects, events
│   │   └── infrastructure/      # Controllers, repositories, adapters`).join('\n')}
│   └── shared/                  # Cross-domain shared code
├── config/                      # Configuration files
├── docs/                        # Documentation
${projectInfo.includeTests ? '├── tests/                      # Test files' : ''}
${projectInfo.includeDocker ? '├── docker/                     # Docker configuration' : ''}
├── package.json
├── .env.example
└── README.md
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature-name\`
3. Make your changes
4. Add tests for your changes
5. Commit your changes: \`git commit -am 'Add some feature'\`
6. Push to the branch: \`git push origin feature-name\`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

${projectInfo.author}

---

**Happy coding! 🚀**`;

        const readmePath = path.join(projectPath, 'README.md');
        await FileUtils.writeFile(readmePath, readmeContent);
        console.log('✅ Generated: README.md');
    }

    /**
     * Genera archivos de configuración de entorno
     */
    private async generateEnvFiles(projectInfo: ProjectInfo, projectPath: string): Promise<void> {
        let envContent = `# Environment Configuration
NODE_ENV=development
PORT=3000

# Application
APP_NAME=${projectInfo.name}
APP_VERSION=${projectInfo.version}

# API Configuration
API_PREFIX=/api
API_VERSION=v1

# CORS Configuration
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization

`;

        // Add database configuration
        if (projectInfo.database !== 'none') {
            envContent += this.getDatabaseEnvConfig(projectInfo.database, projectInfo.name);
        }

        // Add common configurations
        envContent += `
# JWT Configuration (if needed)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
LOG_FILE=app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# External Services (configure as needed)
# EMAIL_SERVICE_API_KEY=
# PAYMENT_GATEWAY_KEY=
# NOTIFICATION_SERVICE_URL=

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=change-this-secret-in-production
`;

        // Generate .env.example
        const envExamplePath = path.join(projectPath, '.env.example');
        await FileUtils.writeFile(envExamplePath, envContent);
        console.log('✅ Generated: .env.example');
    }

    /**
     * Genera el archivo .gitignore
     */
    private async generateGitIgnore(projectPath: string): Promise<void> {
        const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Docker
.dockerignore
docker-compose.override.yml

# Database
*.db
*.sqlite
*.sqlite3

# Backup files
*.backup
*.bak
*.tmp`;

        const gitignorePath = path.join(projectPath, '.gitignore');
        await FileUtils.writeFile(gitignorePath, gitignoreContent);
        console.log('✅ Generated: .gitignore');
    }

    /**
     * Genera archivos adicionales
     */
    private async generateAdditionalFiles(projectInfo: ProjectInfo, projectPath: string): Promise<void> {
        // Generate basic documentation
        await this.generateDocsFiles(projectInfo, projectPath);

        // Generate shared utilities if needed
        await this.generateSharedFiles(projectInfo, projectPath);
    }

    /**
     * Genera archivos de documentación
     */
    private async generateDocsFiles(projectInfo: ProjectInfo, projectPath: string): Promise<void> {
        const docsPath = path.join(projectPath, 'docs');

        // Architecture documentation
        const architectureDoc = `# Architecture Documentation

## Overview

This project follows the **Screaming Architecture** pattern combined with **Domain-Driven Design (DDD)** principles.

## Core Principles

### 1. Screaming Architecture
- The architecture screams the intent of the application
- Domain folders clearly show what the application does
- Framework and database are implementation details

### 2. Domain-Driven Design
- Business logic is encapsulated in domain entities
- Use cases orchestrate domain operations
- Repositories abstract data access
- Domain events enable loose coupling

## Domain Structure

Each domain follows this structure:

\`\`\`
domain/
├── application/
│   ├── services/      # Domain services
│   ├── use-cases/     # Application use cases
│   └── ports/         # Interfaces/contracts
├── domain/
│   ├── entities/      # Business entities
│   ├── value-objects/ # Immutable values
│   └── events/        # Domain events
└── infrastructure/
    ├── repositories/  # Data persistence
    ├── controllers/   # HTTP handlers
    └── adapters/      # External integrations
\`\`\`

## Dependencies Flow

1. **Infrastructure** depends on **Application**
2. **Application** depends on **Domain**
3. **Domain** has no dependencies

This creates a clean, testable architecture where business logic is independent of external concerns.

## Testing Strategy

- **Unit Tests**: Test domain entities and use cases
- **Integration Tests**: Test repository implementations
- **E2E Tests**: Test complete user workflows

## Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
`;

        await FileUtils.writeFile(path.join(docsPath, 'architecture.md'), architectureDoc);
        console.log('✅ Generated: docs/architecture.md');
    }

    /**
     * Genera archivos compartidos
     */
    private async generateSharedFiles(projectInfo: ProjectInfo, projectPath: string): Promise<void> {
        // Generate basic event bus for domain events
        const eventBusContent = `/**
 * Simple Event Bus implementation for domain events
 * This is a basic implementation - consider using a proper message queue in production
 */
class EventBus {
    constructor() {
        this.handlers = new Map();
    }

    /**
     * Subscribe to an event type
     * @param {string} eventType - The event type to listen for
     * @param {Function} handler - The handler function
     */
    subscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(handler);
    }

    /**
     * Unsubscribe from an event type
     * @param {string} eventType - The event type
     * @param {Function} handler - The handler to remove
     */
    unsubscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) return;
        
        const handlers = this.handlers.get(eventType);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Publish an event
     * @param {Object} event - The event to publish
     */
    async publish(event) {
        const { type } = event;
        
        if (!this.handlers.has(type)) {
            console.log(\`No handlers for event type: \${type}\`);
            return;
        }

        const handlers = this.handlers.get(type);
        
        // Execute all handlers
        const promises = handlers.map(handler => {
            try {
                return Promise.resolve(handler(event));
            } catch (error) {
                console.error(\`Error in event handler for \${type}:\`, error);
                return Promise.resolve();
            }
        });

        await Promise.all(promises);
        console.log(\`Event published: \${type}\`);
    }

    /**
     * Clear all handlers (useful for testing)
     */
    clear() {
        this.handlers.clear();
    }
}

module.exports = EventBus;`;

        const eventBusPath = path.join(projectPath, 'src', 'shared', 'infrastructure', 'messaging', 'EventBus.js');
        await FileUtils.writeFile(eventBusPath, eventBusContent);
        console.log('✅ Generated: shared/infrastructure/messaging/EventBus.js');
    }

    // Helper methods for database configuration
    private getDatabaseEnvConfig(database: string, projectName: string): string {
        switch (database) {
            case 'mongodb':
                return `# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/${projectName}
MONGODB_USER=
MONGODB_PASSWORD=
MONGODB_AUTH_SOURCE=admin

`;
            case 'postgresql':
                return `# PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/${projectName}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${projectName}
DB_USER=username
DB_PASSWORD=password
DB_POOL_MIN=2
DB_POOL_MAX=10

`;
            case 'mysql':
                return `# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${projectName}
DB_USER=username
DB_PASSWORD=password
DB_CONNECTION_LIMIT=10
DB_CHARSET=utf8mb4

`;
            default:
                return '';
        }
    }

private getDatabaseEnvDocs(database: string, projectName: string): string {  // <-- Agregar projectName como parámetro
    switch (database) {
        case 'mongodb':
            return `| \`MONGODB_URI\` | MongoDB connection string | \`mongodb://localhost:27017/dbname\` |
| \`MONGODB_USER\` | MongoDB username | \`\` |
| \`MONGODB_PASSWORD\` | MongoDB password | \`\` |`;
        case 'postgresql':
            return `| \`DATABASE_URL\` | PostgreSQL connection string | \`postgresql://user:pass@localhost:5432/dbname\` |
| \`DB_HOST\` | Database host | \`localhost\` |
| \`DB_PORT\` | Database port | \`5432\` |
| \`DB_NAME\` | Database name | \`${projectName}\` |
| \`DB_USER\` | Database user | \`username\` |
| \`DB_PASSWORD\` | Database password | \`password\` |`;
        case 'mysql':
            return `| \`DB_HOST\` | Database host | \`localhost\` |
| \`DB_PORT\` | Database port | \`3306\` |
| \`DB_NAME\` | Database name | \`${projectName}\` |
| \`DB_USER\` | Database user | \`username\` |
| \`DB_PASSWORD\` | Database password | \`password\` |`;
        default:
            return '';
    }
}

    private getDatabaseSetupDocs(database: string, projectName: string): string {
        switch (database) {
            case 'mongodb':
                return `1. Install MongoDB locally or use MongoDB Atlas
2. Create a database named \`${projectName}\`
3. Update the \`MONGODB_URI\` in your \`.env\` file
4. The application will automatically create collections as needed`;
                
            case 'postgresql':
                return `1. Install PostgreSQL locally or use a cloud service
2. Create a database: \`createdb ${projectName}\`
3. Run the initialization scripts in \`docker/postgres/init/\`
4. Update the database connection variables in your \`.env\` file`;
                
            case 'mysql':
                return `1. Install MySQL locally or use a cloud service
2. Create a database: \`CREATE DATABASE ${projectName};\`
3. Run the initialization scripts in \`docker/mysql/init/\`
4. Update the database connection variables in your \`.env\` file`;
                
            default:
                return '';
        }
    }
}

module.exports = ProjectGenerator;