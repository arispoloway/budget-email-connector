FROM node:25-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npx", "tsx", "src/index.ts"]
