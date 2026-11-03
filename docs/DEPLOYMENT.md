# Cloud RISC-V Visual Simulator & Waveform Studio — Deployment Guide

**Target Cloud Infrastructure:**
- **Frontend:** Vercel (React 18 / Vite 5 Single Page Application)
- **Backend:** Render (Docker Container Web Service)
- **RTL Simulator:** Verilator C++ Native Linux Binary (`Vriscv_sim_top`)
- **Microarchitecture:** 5-Stage Pipelined RV32I SystemVerilog Processor

---

## 1. System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL CLOUD FRONTEND                    │
│                                                             │
│   React 18 + Vite 5 + TailwindCSS + Three.js                │
│   https://cloud-risc-v-visual-simulator.vercel.app          │
│                                                             │
│   • Configured with VITE_BACKEND_URL                        │
│   • Client-side VCD waveform parser & visualizer            │
│   • Cycle-accurate pipeline inspector                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ HTTPS / JSON-REST API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDER CLOUD BACKEND                     │
│                                                             │
│   Docker Container Web Service (Debian Bookworm)            │
│   https://cloud-riscv-backend.onrender.com                  │
│                                                             │
│   • FastAPI + Uvicorn Async Web Framework                   │
│   • Dynamic CORS support for *.vercel.app                   │
│   • Health check: GET /api/health                           │
│   • Automated process supervision & stdin/stdout pipe       │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │        Native Linux Verilator Simulation Engine     │   │
│   │                                                     │   │
│   │  /app/build/Vriscv_sim_top (C++ ELF Binary)         │   │
│   │                                                     │   │
│   │  • SystemVerilog RTL (hardware/rtl/*.sv)            │   │
│   │  • Top-level simulation wrapper (riscv_sim_top.sv)  │   │
│   │  • Dual-edge clock evaluation & VCD dumper          │   │
│   │  • Hardware register file (32 words) & Data memory  │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Environment Variables

### Backend (Render / Docker)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port for Uvicorn web server (Render sets this dynamically). |
| `USE_WSL` | `0` (Linux) / `1` (Windows) | Set to `0` in container / Linux deployment to bypass `wsl.exe`. |
| `SIM_EXE` | `/app/build/Vriscv_sim_top` | Absolute path to the compiled Verilator simulation executable. |
| `SIM_DIR` | `/app/hardware/sim` | Directory for runtime assembler hex files. |
| `TRACE_DIR` | `/app/build` | Directory where `.vcd` waveform files are written. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed origins. |
| `CORS_ORIGIN_REGEX` | `^https:\/\/.*\.vercel\.app$` | Regex allowing any Vercel deployment preview / production URL. |

### Frontend (Vercel)

| Variable | Local Default | Production Example | Description |
| :--- | :--- | :--- | :--- |
| `VITE_BACKEND_URL` | `""` (proxy to `:8000`) | `https://cloud-riscv-backend.onrender.com` | Public URL of deployed Render FastAPI backend. |

---

## 3. Local Development Workflows

### Mode A: Windows + WSL2 Development (Preserved)
1. Ensure WSL2 Ubuntu is installed with Verilator:
   ```bash
   wsl -d Ubuntu -- verilator --version
   ```
2. Start the FastAPI backend from Windows:
   ```powershell
   cd D:\RISC-V_Project
   uvicorn backend.app.main:app --reload --port 8000
   ```
   *The backend auto-detects `platform.system() == "Windows"` and manages the simulator through `wsl.exe`.*
3. Start the Vite React development server:
   ```powershell
   npm --prefix frontend run dev
   ```
4. Access `http://localhost:3000`.

### Mode B: Local Docker Container (Testing Container Setup)
1. Build the Docker image locally:
   ```bash
   docker build -t cloud-riscv-simulator .
   ```
2. Run the container:
   ```bash
   docker run -p 8000:8000 -e CORS_ORIGINS="http://localhost:3000" cloud-riscv-simulator
   ```
3. Test backend health:
   ```bash
   curl http://localhost:8000/api/health
   ```

---

## 4. Render Deployment Instructions (Backend)

Render hosts the containerized FastAPI backend and the compiled Verilator binary.

### Step 1: Connect Repository to Render
1. Sign in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect:
   `https://github.com/ramji-4412/Cloud-RISC-V-Visual-Simulator`

### Step 2: Configure Web Service
* **Name:** `cloud-riscv-backend`
* **Region:** Oregon (US West) or nearest region
* **Branch:** `main`
* **Runtime:** `Docker`
* **Dockerfile Path:** `./Dockerfile`
* **Instance Type:** `Free` (or `Starter` for higher CPU/memory)

### Step 3: Configure Environment Variables
Under the **Environment Variables** section on Render, add:
* `USE_WSL`: `0`
* `CORS_ORIGIN_REGEX`: `^https:\/\/.*\.vercel\.app$`
* `CORS_ORIGINS`: `http://localhost:3000,http://127.0.0.1:3000`

### Step 4: Health Check Path
Under **Advanced Settings**:
* **Health Check Path:** `/api/health`

### Step 5: Deploy
Click **Create Web Service**. Render will:
1. Clone the repository.
2. Build the Docker image.
3. Install Verilator and build tools.
4. Compile the SystemVerilog processor RTL and C++ simulation engine into `/app/build/Vriscv_sim_top`.
5. Launch Uvicorn on `$PORT`.
6. Once deployed, copy your Render service URL (e.g., `https://cloud-riscv-backend.onrender.com`).

---

## 5. Vercel Deployment Instructions (Frontend)

Vercel hosts the React + Vite frontend single-page application.

### Step 1: Import Project in Vercel
1. Sign in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Import repository: `ramji-4412/Cloud-RISC-V-Visual-Simulator`.

### Step 2: Configure Project Settings
* **Framework Preset:** `Vite`
* **Root Directory:** Click **Edit** and set to `frontend`.
* **Build Command:** `vite build` (or `npm run build`)
* **Output Directory:** `dist`
* **Install Command:** `npm install`

### Step 3: Set Environment Variables
Under **Environment Variables**, add:
* **Key:** `VITE_BACKEND_URL`
* **Value:** `https://cloud-riscv-backend.onrender.com` (your actual Render URL from Section 4)

### Step 4: Deploy
Click **Deploy**. Once built, Vercel gives you your production URL (e.g., `https://cloud-risc-v-visual-simulator.vercel.app`).

---

## 6. End-to-End Verification Checklist

After deploying both services, verify the complete cloud pipeline:

1. **Backend Health Check:**
   ```bash
   curl -s https://<your-render-backend>.onrender.com/api/health
   # Expected response: {"status":"healthy","service":"RISC-V Backend"}
   ```
2. **Simulator Status Check:**
   ```bash
   curl -s https://<your-render-backend>.onrender.com/api/simulator/status
   # Expected response: {"connected":true,"engine":"Verilator",...}
   ```
3. **Frontend Connection:**
   - Open `https://<your-vercel-app>.vercel.app`.
   - Verify TopBar displays green indicator: **FastAPI RTL Link Online**.
4. **Assembly and Hardware Execution:**
   - Click **Assemble & Load**.
   - Click **Run** or **Step**.
   - Verify pipeline stages advance and register values update in the **Register File Inspector**.
5. **Waveform Generation:**
   - Click **Start Trace**.
   - Step 10 clock cycles.
   - Click **Stop Trace**.
   - Navigate to **Waveforms** tab to view actual Verilator VCD traces.

---

## 7. Troubleshooting & Free-Tier Operational Notes

### Cold Starts on Render Free Tier
* Render Free tier instances spin down after 15 minutes of inactivity.
* The first HTTP request after spin-down may take ~30-50 seconds while the container initializes.
* The frontend handles timeouts gracefully; once warmed, requests execute with sub-millisecond RTL latency.

### Ephemeral Filesystem
* Containers have ephemeral disk storage.
* Assembled program hex files (`assembled.hex`) and waveform traces (`pipeline.vcd`) are generated in `/app/hardware/sim` and `/app/build`. They are stored in memory/container temp storage during the active session.

### Redeployment Procedure
* When modifying RTL code (`hardware/rtl/*.sv`) or backend code:
  Push to `main`. Render automatically triggers a Docker rebuild, re-running Verilator and recompiling the simulation binary.
* When modifying frontend code:
  Push to `main`. Vercel automatically deploys the updated static build.

