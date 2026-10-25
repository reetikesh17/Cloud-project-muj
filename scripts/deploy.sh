#!/bin/bash
# ==============================================================================
# Automated Zero-Downtime / Container Deployment Script
# ==============================================================================

set -e

IMAGE_NAME="library-management-system"
TAG="${1:-latest}"
PORT="${PORT:-3000}"

echo "=========================================================="
echo "🚀 Starting Automated Deployment: $IMAGE_NAME:$TAG"
echo "=========================================================="

# Step 1: Run pre-flight health test on repository
echo "[1/4] Running automated tests prior to deployment..."
npm test

# Step 2: Build fresh container image
echo "[2/4] Building production container image..."
docker build -t "$IMAGE_NAME:$TAG" .

# Step 3: Gracefully stop existing container if running
echo "[3/4] Rotating running container..."
if [ "$(docker ps -q -f name=$IMAGE_NAME)" ]; then
    echo "Stopping existing container instance..."
    docker stop "$IMAGE_NAME" || true
fi

if [ "$(docker ps -aq -f name=$IMAGE_NAME)" ]; then
    echo "Removing old container instance..."
    docker rm "$IMAGE_NAME" || true
fi

# Step 4: Run new container with persistent storage
echo "[4/4] Launching updated container on port $PORT..."
docker run -d \
    --name "$IMAGE_NAME" \
    -p "$PORT:3000" \
    --restart unless-stopped \
    -v library_storage:/usr/src/app/data_storage \
    "$IMAGE_NAME:$TAG"

# Verification: Wait and check health endpoint
echo "Verifying deployment health..."
sleep 4

if command -v curl >/dev/null 2>&1; then
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" || echo "000")
    if [ "$HEALTH_STATUS" -eq 200 ]; then
        echo "✅ Deployment SUCCESSFUL! Service is healthy on http://localhost:$PORT"
    else
        echo "⚠️ Warning: Health check returned status $HEALTH_STATUS. Checking container logs:"
        docker logs "$IMAGE_NAME"
    fi
else
    echo "✅ Container started successfully."
fi
