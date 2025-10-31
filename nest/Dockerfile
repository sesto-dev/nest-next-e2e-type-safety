# ---------- builder ----------
FROM node:20-bullseye AS builder
WORKDIR /usr/src/app

# enable corepack & prepare pnpm version (match your repo)
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# copy lockfile & package.json first (improves caching)
COPY package.json pnpm-lock.yaml ./

# show versions (debug) and install all deps including devDependencies
RUN pnpm -v && node -v && pnpm install --prod=false

# copy source
COPY . .

# run prisma generate and build
RUN pnpm run build

# prune dev deps so the node_modules contains only production deps
# (this will remove dev dependencies from node_modules)
RUN pnpm prune --prod

# ---------- runtime ----------
FROM node:20-bullseye-slim AS runner
WORKDIR /usr/src/app

# copy production node_modules, dist, prisma, etc.
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=3000

# ensure the node user can write to the app dir
RUN chown -R node:node /usr/src/app

USER node

EXPOSE 3000

# adjust path if your build outputs a different file (dist/main.js vs dist/src/main.js)
CMD ["node", "dist/src/main.js"]
