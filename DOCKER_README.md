# Docker Setup for Power of Europe Hack

This project includes a complete Docker Compose setup for easy development and deployment.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- API keys for Mistral AI and/or OpenAI (optional, but required for AI functionality)

### Development Setup

1. **Clone the repository** (if you haven't already)
   ```bash
   git clone <your-repo-url>
   cd power-of-europe-hack
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```bash
   MISTRAL_API_KEY=your_mistral_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the applications**
   - Frontend (Next.js): http://localhost:3000
   - Backend API (FastAPI): http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:5432
   - Redis: localhost:6379

### Production Setup

For production deployment, use the production Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📋 Services Overview

### Backend (FastAPI)
- **Port**: 8000
- **Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs
- **Features**: AI assistant with tool calling capabilities

### Frontend (Next.js)
- **Port**: 3000
- **Features**: Modern React application with Nhost integration

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: power_of_europe
- **User**: postgres
- **Password**: postgres_password (change in production!)

### Redis (Cache)
- **Port**: 6379
- **Purpose**: Caching and session storage

## 🛠️ Common Commands

### Start services
```bash
# Start all services in development mode
docker-compose up -d

# Start specific service
docker-compose up backend

# View logs
docker-compose logs -f
docker-compose logs -f backend
```

### Stop services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ This will delete database data)
docker-compose down -v
```

### Rebuild services
```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and start
docker-compose up --build
```

### Database operations
```bash
# Access PostgreSQL directly
docker-compose exec postgres psql -U postgres -d power_of_europe

# View database logs
docker-compose logs postgres

# Backup database
docker-compose exec postgres pg_dump -U postgres power_of_europe > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres power_of_europe < backup.sql
```

### Development helpers
```bash
# Follow backend logs
docker-compose logs -f backend

# Execute commands in containers
docker-compose exec backend python -c "import sys; print(sys.version)"
docker-compose exec frontend npm list

# Shell access
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Required API Keys
MISTRAL_API_KEY=your_mistral_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Database (change password in production!)
POSTGRES_PASSWORD=postgres_password

# Nhost Configuration
NEXT_PUBLIC_NHOST_SUBDOMAIN=local
NEXT_PUBLIC_NHOST_REGION=local
NHOST_ADMIN_SECRET=nhost-admin-secret
NHOST_WEBHOOK_SECRET=nhost-webhook-secret
NHOST_JWT_SECRET=0f987876650b4a085e64594fae9219e7781b17506bec02489ad061fba8cb22db

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Customization

- **Port Changes**: Modify the `ports` section in `docker-compose.yml`
- **Environment Variables**: Add them to the `environment` section of each service
- **Volumes**: Mount additional directories by adding them to the `volumes` section
- **Networks**: Services communicate through the `power-of-europe-network`

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :8000
   
   # Change ports in docker-compose.yml if needed
   ```

2. **Database connection issues**
   ```bash
   # Check if PostgreSQL is healthy
   docker-compose ps postgres
   
   # View database logs
   docker-compose logs postgres
   ```

3. **Frontend can't reach backend**
   - Ensure `NEXT_PUBLIC_BACKEND_URL` is set correctly
   - Check if backend service is running: `docker-compose ps backend`

4. **Build failures**
   ```bash
   # Clear Docker cache and rebuild
   docker system prune -a
   docker-compose build --no-cache
   ```

### Health Checks

All services include health checks. Check their status:

```bash
docker-compose ps
```

### Performance

- **Development**: Uses volume mounts for hot-reloading
- **Production**: Optimized builds with multi-stage Dockerfiles
- **Database**: Persistent storage with proper indexing

## 📁 File Structure

```
power-of-europe-hack/
├── docker-compose.yml          # Development configuration
├── docker-compose.prod.yml     # Production configuration
├── backend/
│   ├── Dockerfile              # Backend container definition
│   └── .dockerignore
├── nhost-next/
│   ├── Dockerfile              # Frontend development container
│   ├── Dockerfile.prod         # Frontend production container
│   └── .dockerignore
├── database/
│   └── init/
│       └── 01-init.sql         # Database initialization
└── DOCKER_README.md            # This file
```

## 🚢 Production Deployment

For production deployment:

1. Use `docker-compose.prod.yml`
2. Set secure passwords and secrets
3. Configure SSL certificates for Nginx (if using)
4. Set up proper monitoring and logging
5. Consider using Docker Swarm or Kubernetes for scaling

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 📝 Next Steps

- Set up CI/CD pipeline
- Add monitoring with Prometheus/Grafana
- Configure log aggregation
- Set up automated backups
- Add SSL/TLS certificates
- Configure reverse proxy rules

---

For more information about the application itself, see the main [README.md](README.md). 