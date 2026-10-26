# ============================================
# SSH FRONTEND (SvelteKit adapter-node)
# Build the static assets + Node server with
# Vite, then serve them with the tiny node
# runtime from the adapter output.
# ============================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Baked into the client bundle: where the browser calls the backend.
# Override at build time: --build-arg VITE_API_BASE_URL=https://api.example.com
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
ENTRYPOINT ["sh", "-c", "PORT=${PORT:-3000} ORIGIN=${ORIGIN:-} node build/index.js"]
