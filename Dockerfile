FROM node:24-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM node:24-slim AS runtime

WORKDIR /app
COPY --from=build /app ./

CMD ["node", "dist/index.js"]
