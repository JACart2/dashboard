# JACart Dashboard

The JACart Dashboard is a web-based monitoring and control interface for viewing the state of one or more autonomous carts.

The dashboard currently supports:

- Cart registration and status updates
- Trip progress monitoring
- Help-request status
- Live Socket.IO updates
- Front and rear camera feeds
- Cart logs and anomaly information
- Redis-backed cart state
- HTTPS using a local or self-signed certificate
- A bind-mounted Docker development environment
- Future AI-assisted log analysis through a separate worker service

---

## Architecture

The dashboard is split into three primary services:

```text
Dashboard UI
    |
    | HTTPS / Socket.IO
    v
Dashboard Server
    |
    | Redis reads, writes, and pub/sub
    v
Redis
```

Camera data follows this path:

```text
ZED camera topic
    |
    v
ROSBridge
    |
    v
Cart UI
    |
    | Socket.IO camera-frame event
    v
Dashboard Server
    |
    | Socket.IO camera-update event
    v
Dashboard UI
```

The dashboard does not currently subscribe to ROS 2 topics directly. The cart UI receives the ROS camera data through ROSBridge and forwards compressed image frames to the dashboard server.

---

## Repository Layout

```text
dashboard/
├── compose.yaml
├── Dockerfile.dev
├── package.json
├── package-lock.json
├── .env
├── certs/
│   ├── dashboard.crt
│   └── dashboard.key
├── server/
│   ├── src/
│   └── static/
├── ui/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
└── README.md
```

The root package manages the dashboard server.

The `ui/` package contains the Vite React frontend.

The Vite production build is written to:

```text
server/static/
```

---

## Requirements

Install the following on the dashboard host:

- Docker Engine
- Docker Compose plugin
- Git
- A dashboard TLS certificate and private key

Verify Docker:

```bash
docker version
docker compose version
```

---

## ZeroTier Network Access

The dashboard is accessed over the JACart ZeroTier network rather than through a public internet address. The dashboard host currently uses the ZeroTier IP:

```text
10.247.225.41
```

Devices must be connected to the same ZeroTier network before they can reach the dashboard, API, Socket.IO server, or camera feeds.

Default dashboard endpoints:

```text
Dashboard:
https://10.247.225.41:8000

Vite development UI:
http://10.247.225.41:5174
```

The ZeroTier IP is also used in the dashboard environment configuration:

```env
CORS_ALLOWED_ORIGINS=https://10.247.225.41:8000,http://10.247.225.41:5174,http://10.247.225.41:5173
```

If the dashboard host receives a different ZeroTier IP, update the following:

* `CORS_ALLOWED_ORIGINS`
* `VITE_API_ROOT`
* `VITE_DASHBOARD_ROOT`
* Cart registration or startup scripts that reference the dashboard address
* Any saved browser bookmarks or testing commands

To check the dashboard host’s ZeroTier address:

```bash
ip address | grep -A2 zt
```

or:

```bash
zerotier-cli listnetworks
```

The ZeroTier IP should not be assumed to be the same as the machine’s Ethernet, Wi-Fi, Docker, or localhost address.


## Self-Signed HTTPS Certificate

The dashboard uses a self-signed TLS certificate so the web interface, API, and Socket.IO connection can run over HTTPS without requiring a public certificate authority.

The certificate files are stored on the dashboard host at:

```text
certs/dashboard.crt
certs/dashboard.key
```

The private key must never be shared or committed to Git.

Because the certificate is self-signed, browsers will show a security warning the first time the dashboard is opened:

```text
https://10.247.225.41:8000
```

The user must manually accept the certificate risk before the dashboard, API requests, and secure WebSocket connections can work correctly.

This acceptance may need to be repeated on each browser or device that accesses the dashboard.

The Docker container reads the certificate through these paths:

```text
/workspace/dashboard/certs/dashboard.crt
/workspace/dashboard/certs/dashboard.key
```

These paths are supplied through:

```env
SSL_CERT_PATH=/workspace/dashboard/certs/dashboard.crt
SSL_KEY_PATH=/workspace/dashboard/certs/dashboard.key
```

If the certificate is regenerated, replaced, or the ZeroTier IP changes, browsers may require the new certificate to be accepted again.

For production deployment, replace the self-signed certificate with a certificate issued by a trusted internal or public certificate authority.


## Environment Configuration

Create a root `.env` file:

```env
DASHBOARD_PORT=8000

CORS_ALLOWED_ORIGINS=https://10.247.225.41:8000,http://10.247.225.41:8000,http://10.247.225.41:5174,https://10.247.225.41:5174,http://10.247.225.41:5173,https://10.247.225.41:5173
```

`DASHBOARD_PORT` controls the host-facing port.

The server continues to listen on port `8000` inside the container.

For example:

```env
DASHBOARD_PORT=8080
```

maps:

```text
host port 8080 -> container port 8000
```

The dashboard would then be available at:

```text
https://<dashboard-host>:8080
```

Update `CORS_ALLOWED_ORIGINS` whenever the external host or port changes.

---

## Certificates

The dashboard expects:

```text
certs/dashboard.key
certs/dashboard.crt
```

These files are bind mounted into the container through the repository mount.

Inside the container, the server uses:

```text
/workspace/dashboard/certs/dashboard.key
/workspace/dashboard/certs/dashboard.crt
```

Do not commit `dashboard.key`.

Recommended `.gitignore` entries:

```gitignore
certs/*.key
.env
node_modules/
ui/node_modules/
```

If the private key is exposed, generate a new key and certificate.

---

## Docker Development Setup

The development setup uses bind mounts.

Changes made on the host are immediately visible inside the containers.

The running services are:

- `dashboard-server`
- `dashboard-ui`
- `redis`

### Compose Configuration

Example `compose.yaml`:

```yaml
services:
  dashboard-server:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: server-dev

    container_name: jacart-dashboard-server
    restart: unless-stopped

    working_dir: /workspace/dashboard
    command: npm run dev

    ports:
      - "${DASHBOARD_PORT:-8000}:8000"

    environment:
      NODE_ENV: development
      HOST: 0.0.0.0
      PORT: "8000"

      STATIC_DIR: /workspace/dashboard/server/static

      SSL_KEY_PATH: /workspace/dashboard/certs/dashboard.key
      SSL_CERT_PATH: /workspace/dashboard/certs/dashboard.crt

      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
      REDIS_URL: redis://redis:6379

      SOCKET_MAX_BUFFER_BYTES: "5000000"

    volumes:
      - ./:/workspace/dashboard
      - dashboard-server-node-modules:/workspace/dashboard/node_modules

    depends_on:
      redis:
        condition: service_healthy

    networks:
      - dashboard-network

  dashboard-ui:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: ui-dev

    container_name: jacart-dashboard-ui
    restart: unless-stopped

    working_dir: /workspace/dashboard/ui

    command:
      - npm
      - run
      - dev
      - --
      - --host
      - 0.0.0.0
      - --port
      - "5174"

    ports:
      - "5174:5174"

    environment:
      VITE_API_ROOT: https://10.247.225.41:${DASHBOARD_PORT:-8000}/api/
      VITE_DASHBOARD_ROOT: https://10.247.225.41:${DASHBOARD_PORT:-8000}

    volumes:
      - ./:/workspace/dashboard
      - dashboard-ui-node-modules:/workspace/dashboard/ui/node_modules

    depends_on:
      - dashboard-server

    networks:
      - dashboard-network

  redis:
    image: redis:7-alpine

    container_name: jacart-dashboard-redis
    restart: unless-stopped

    command:
      - redis-server
      - --appendonly
      - "yes"

    volumes:
      - dashboard-redis-data:/data

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

    networks:
      - dashboard-network

volumes:
  dashboard-server-node-modules:
  dashboard-ui-node-modules:
  dashboard-redis-data:

networks:
  dashboard-network:
    driver: bridge
```

### Development Dockerfile

Example `Dockerfile.dev`:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*


FROM base AS server-dev

WORKDIR /workspace/dashboard

COPY package.json package-lock.json ./

RUN npm ci

CMD ["npm", "run", "dev"]


FROM base AS ui-dev

WORKDIR /workspace/dashboard/ui

COPY ui/package.json ui/package-lock.json ./

RUN npm ci

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
```

---

## Starting the Dashboard

Validate the Compose configuration:

```bash
docker compose config
```

Build and start:

```bash
docker compose up --build
```

Start in detached mode:

```bash
docker compose up -d --build
```

View service status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

View a specific service:

```bash
docker compose logs -f dashboard-server
docker compose logs -f dashboard-ui
docker compose logs -f redis
```

Stop the services:

```bash
docker compose down
```

Do not use the following command unless Redis and dependency volumes should also be deleted:

```bash
docker compose down -v
```

---

## Dashboard URLs

Dashboard server and static UI:

```text
https://10.247.225.41:8000
```

Vite development UI:

```text
http://10.247.225.41:5174
```

If `DASHBOARD_PORT` changes, use that port instead of `8000`.

---

## Local Development Without Docker

### Server

From the repository root:

```bash
npm install
npm run dev
```

### UI

From the UI directory:

```bash
cd ui
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

### Build the UI for Express

```bash
cd ui
npm run build
```

The built files are written to:

```text
server/static/
```

The dashboard server serves those files over HTTPS.

---

## Redis

The dashboard uses Redis for cart state and pub/sub communication.

Inside Docker, Redis is available at:

```text
redis://redis:6379
```

The server must read the URL from:

```env
REDIS_URL=redis://redis:6379
```

Do not hardcode `127.0.0.1` in the server Redis client when running through Compose.

### Inspect Redis

List keys:

```bash
docker compose exec redis redis-cli SCAN 0
```

Check a key type:

```bash
docker compose exec redis redis-cli TYPE <key>
```

Read common Redis types:

```bash
docker compose exec redis redis-cli GET <key>
docker compose exec redis redis-cli HGETALL <key>
docker compose exec redis redis-cli LRANGE <key> 0 -1
docker compose exec redis redis-cli XRANGE <key> - +
```

Check Redis health:

```bash
docker compose exec redis redis-cli ping
```

Expected:

```text
PONG
```

Redis uses append-only persistence, so stored keys survive container restarts.

Pub/sub messages are not retained unless the application also saves them as Redis keys.

---

## Cart Registration

The dashboard exposes the cart registration endpoint:

```text
POST /api/vehicles/register/
```

Example:

```bash
curl -k -X POST \
  https://10.247.225.41:8000/api/vehicles/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "james",
    "url": "ws://10.247.225.50:9090",
    "port": 9090
  }'
```

Sending the explicit ROSBridge URL is recommended.

If only a port is provided, the server may attempt to derive the cart IP from the request address, which may be incorrect when Docker, NAT, or ZeroTier is involved.

---

## Socket.IO

The dashboard uses Socket.IO for:

- live cart updates
- camera frames
- AI analysis updates
- future real-time dashboard events

Test the Socket.IO polling endpoint:

```bash
curl -k \
  "https://10.247.225.41:8000/socket.io/?EIO=4&transport=polling"
```

Expected output begins with:

```text
0{"sid":"..."
```

The server supports:

```text
websocket
polling
```

Camera frames may be several hundred kilobytes. The server uses an increased Socket.IO payload limit through:

```env
SOCKET_MAX_BUFFER_BYTES=5000000
```

---

## Camera Streaming

Camera images are not sent directly from ROS 2 to the dashboard.

The cart UI subscribes to a compressed image topic through ROSBridge, converts it to a browser image URL, and sends it to the dashboard through Socket.IO.

Example topics:

```text
/zed_front/zed_node_0/rgb/color/rect/image/compressed
/zed_rear/zed_node_1/rgb/color/rect/image/compressed
```

The exact topic names may differ by cart configuration.

The topic type must be:

```text
sensor_msgs/msg/CompressedImage
```

The cart UI emits:

```ts
socket.emit("camera-frame", {
  name: cartName,
  camera: "front",
  data: base64Image,
});
```

or:

```ts
socket.emit("camera-frame", {
  name: cartName,
  camera: "rear",
  data: base64Image,
});
```

The dashboard server emits:

```text
camera-update
```

to connected dashboard clients.

### Verify Camera Topics

```bash
ros2 topic list | grep -E "zed.*compressed|zed.*image"
```

```bash
ros2 topic info /path/to/image/compressed
```

```bash
ros2 topic hz /path/to/image/compressed
```

### Camera Troubleshooting

If the cart UI only logs the subscription but receives no frames:

```text
[Camera] subscribing to compressed camera topic: ...
```

check:

- The topic has a publisher.
- The topic type is `sensor_msgs/msg/CompressedImage`.
- ROSBridge is connected.
- ROSBridge logs show a subscription to the exact topic.
- The browser is using the newest UI build.
- The ROSBridge instance is on the correct ROS domain.

If the dashboard shows the image alt text instead of an image, verify that ROSBridge is already sending the `data` field as a base64 string. Do not encode an already base64-encoded string a second time.

---

## CORS

Allowed origins are configured through:

```env
CORS_ALLOWED_ORIGINS=...
```

The server uses the same allowlist for:

- Express API requests
- Socket.IO connections

Example:

```env
CORS_ALLOWED_ORIGINS=https://10.247.225.41:8000,http://10.247.225.41:5174,http://10.247.225.41:5173
```

Requests without an `Origin` header are allowed so that command-line tools, health checks, and server-to-server requests continue to work.

---

## Bind-Mount Behavior

The repository is mounted into both dashboard containers:

```yaml
volumes:
  - ./:/workspace/dashboard
```

This means host changes are immediately visible inside the containers.

Backend changes require the root development script to use a file watcher.

Example:

```json
{
  "scripts": {
    "dev": "tsx watch server/src/server.ts"
  }
}
```

The Vite UI should hot reload automatically.

The named `node_modules` volumes prevent the host bind mount from hiding container-installed dependencies:

```text
dashboard-server-node-modules
dashboard-ui-node-modules
```

When `package.json` or `package-lock.json` changes, rebuild the affected service:

```bash
docker compose build dashboard-server
docker compose build dashboard-ui
docker compose up -d
```

---

## AI Log Analysis

The recommended AI architecture is a separate worker and model service:

```text
Dashboard Server
    |
    v
Redis job queue
    |
    v
AI log worker
    |
    v
Ollama
    |
    v
Redis result channel
    |
    v
Dashboard UI
```

The AI model should not be embedded directly into the dashboard server container.

The model should:

- summarize related log messages
- identify likely subsystem failures
- recommend operator checks
- provide a confidence score
- return structured JSON

The model should not:

- apply brakes
- resume navigation
- change steering
- clear critical alerts
- control safety-critical cart behavior

Safety decisions must remain deterministic and outside the language model.

---

## Common Commands

Rebuild everything:

```bash
docker compose up -d --build
```

Restart only the server:

```bash
docker compose restart dashboard-server
```

Restart only the UI:

```bash
docker compose restart dashboard-ui
```

Follow backend logs:

```bash
docker compose logs -f dashboard-server
```

Open a shell in the backend container:

```bash
docker compose exec dashboard-server bash
```

Open a shell in the UI container:

```bash
docker compose exec dashboard-ui bash
```

Open Redis CLI:

```bash
docker compose exec redis redis-cli
```

Validate Compose substitutions:

```bash
docker compose config
```

---

## Troubleshooting

### Dockerfile Not Found

Ensure the file is named exactly:

```text
Dockerfile.dev
```

Linux filenames are case-sensitive.

### Dockerfile Parse Error

Keep JSON-form `CMD` instructions on one line:

```dockerfile
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
```

### `npm ci` Fails

Run locally:

```bash
cd ui
npm ci
```

If `package.json` and `package-lock.json` are out of sync:

```bash
rm -rf node_modules
npm install
npm ci
```

Then rebuild the UI image.

### Redis Connection Refused

Confirm the server uses:

```text
redis://redis:6379
```

not:

```text
redis://127.0.0.1:6379
```

### Socket.IO Connection Fails

Test:

```bash
curl -k \
  "https://10.247.225.41:8000/socket.io/?EIO=4&transport=polling"
```

Check:

```bash
docker compose logs -f dashboard-server
```

### Static UI Is Outdated

Rebuild the Vite UI:

```bash
cd ui
npm run build
```

Then hard refresh the browser.

The bind-mounted server container sees the new files immediately under:

```text
/workspace/dashboard/server/static
```

---

## Security Notes

- Never commit `dashboard.key`.
- Treat camera frames and cart telemetry as sensitive operational data.
- Use explicit CORS origins.
- Do not expose Redis directly to the public network.
- Keep Ollama and future AI worker services on the internal Compose network.
- Rotate the TLS key and certificate if the private key is exposed.
- Do not permit AI-generated output to directly control the cart.

---

## Current Development Endpoints

Default values:

```text
Dashboard HTTPS server:
https://10.247.225.41:8000

Dashboard Vite development server:
http://10.247.225.41:5174

Redis inside Compose:
redis://redis:6379
```

Adjust these values through `.env` and `compose.yaml` as needed.