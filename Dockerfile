FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application (Vite client + esbuild server)
RUN npm run build

# --- Production stage ---
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.cjs"]
