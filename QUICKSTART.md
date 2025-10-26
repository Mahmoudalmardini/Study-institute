# Study Institute - Quick Start

## 🚀 Starting the Application

### Option 1: Use the PowerShell Script (Easiest - Windows)

Simply run the start script:

```powershell
.\start-all.ps1
```

This script will:
1. ✅ Check and clear any processes using ports 3000/3001
2. ✅ Start Docker services (PostgreSQL & Redis)
3. ✅ Start the Backend server (port 3001)
4. ✅ Start the Frontend server (port 3000)
5. ✅ Open your browser to http://localhost:3000

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

### Option 2: Manual Start

#### 1. Start Database Services
```bash
docker-compose up -d
```

#### 2. Start Backend
```bash
cd backend
npm run start:dev
```

#### 3. Start Frontend  
```bash
cd frontend
npm run dev
```

---

## 📚 Additional Documentation

- **[README.md](./README.md)** - Project overview and features
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[DOCKER.md](./DOCKER.md)** - Docker configuration guide
- **[QUICKSTART.md](./QUICKSTART.md)** - This file
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current project status

---

## 🛑 Stopping the Application

Use the stop script:
```powershell
.\stop-all.ps1
```

Or manually:
- Press `Ctrl+C` in backend/frontend terminals
- Run: `docker-compose down`

