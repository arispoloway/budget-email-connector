FROM node:24-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npx", "tsx", "src/index.ts"]
