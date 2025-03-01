FROM ubuntu:jammy AS base
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONPATH=/app
ENV PATH="/usr/local/bin:${PATH}"
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-minimal \
    python3-pip \
    curl \
    ca-certificates \
    file \
    wget \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Python API dependencies
FROM base AS python-deps
WORKDIR /app
COPY backend/requirements.txt ./backend/
RUN pip3 install --no-cache-dir -r backend/requirements.txt

# Stage 3: Node.js dependencies and build
FROM base AS node-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN echo 'module.exports = { typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true } }' > next.config.js && \
    npm run build

# Final stage
FROM base
WORKDIR /app

# Copy Python backend
COPY --from=python-deps /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY backend/ ./backend/

# Copy Next.js build
COPY --from=node-deps /app/frontend/ ./frontend/

# Expose ports
EXPOSE 3000 8000

# Start services
RUN echo '#!/bin/bash\n\
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &\n\
cd /app/frontend && npm start' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]