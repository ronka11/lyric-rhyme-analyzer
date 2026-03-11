# ── Stage 1: Build React ──────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files first (Docker caches this layer — faster rebuilds)
COPY frontend/package*.json ./
RUN npm install

# Copy source and build
# CRA outputs to /app/frontend/build (not /dist like Vite)
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python + FastAPI ─────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code (main.py is at root, not in a backend/ subfolder)
COPY main.py ./
COPY testing_lrc.py ./

# Copy the React build output — CRA outputs to 'build', we rename it 'frontend_dist'
COPY --from=frontend-builder /app/frontend/build ./frontend_dist

# Expose port
EXPOSE 8000

# Start FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]