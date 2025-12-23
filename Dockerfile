FROM node:24-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Type-check during build to catch errors early
RUN npm run typecheck

CMD ["npx", "tsx", "src/index.ts"]
