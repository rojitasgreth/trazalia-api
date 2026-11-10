# syntax=docker/dockerfile:1
# Imagen de producción de la API y del worker (mismo código, distinto comando).

FROM node:26-bookworm-slim AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Generar el cliente no se conecta a la base; la URL solo satisface prisma.config.ts.
RUN DATABASE_URL_MIGRACIONES=postgresql://construccion@localhost/construccion npm run prisma:generar \
 && npm run build && npm prune --omit=dev

FROM node:26-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=construccion /app/package.json ./
COPY --from=construccion /app/node_modules ./node_modules
COPY --from=construccion /app/dist ./dist
USER node
EXPOSE 3000
# Para el worker: docker run <imagen> node dist/worker.js
CMD ["node", "dist/main.js"]
