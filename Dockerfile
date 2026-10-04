FROM node:25-slim

WORKDIR /app
COPY package*.json ./
# Install build dependencies and create the 'python' symlink node-gyp expects
RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Speed up npm ci by disabling audit/fund checks during build
RUN npm ci --prefer-offline --no-audit
COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
