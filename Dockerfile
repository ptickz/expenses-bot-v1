FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS migrate
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS build
COPY . .
RUN DATABASE_URL=postgresql://stub:stub@localhost:5432/stub npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
USER node

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./

CMD ["node", "dist/main.js"]
