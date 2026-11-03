# Multi-stage or single-stage Dockerfile for Cloud RISC-V Simulator Backend
FROM python:3.11-slim-bookworm

# Avoid interactive prompts during apt package installation
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install essential build tools, Verilator, perl, and ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    verilator \
    perl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies first (cached across code edits)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy SystemVerilog processor RTL and C++ simulation wrapper
COPY hardware/rtl ./hardware/rtl
COPY hardware/sim ./hardware/sim

# Compile the SystemVerilog processor RTL and C++ simulation engine with Verilator
RUN mkdir -p /app/build && \
    verilator --cc --trace \
      -CFLAGS "-I/app/hardware/sim/include" \
      --Mdir /app/build \
      --top-module riscv_sim_top \
      --exe \
      hardware/sim/main.cpp \
      hardware/sim/protocol.cpp \
      hardware/sim/simulation_engine.cpp \
      hardware/rtl/*.sv \
      hardware/sim/riscv_sim_top.sv \
      --build -o Vriscv_sim_top && \
    chmod +x /app/build/Vriscv_sim_top

# Copy backend application source
COPY backend ./backend

# Environment variables for native Linux execution
ENV USE_WSL=0 \
    SIM_EXE=/app/build/Vriscv_sim_top \
    SIM_DIR=/app/hardware/sim \
    TRACE_DIR=/app/build \
    PORT=8000

EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0 and dynamic $PORT with exec for clean signal handling & single-worker enforcement
CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]

