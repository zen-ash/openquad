# build everything, then copy just the two build outputs into a small image.
# the server bundle has no dependencies left, so no node_modules in the final image
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

# install first so this layer is cached when only source files change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY . .
# vite bakes VITE_ variables into the js when it builds, so the key has to be here for
# the build. render hands its env vars to docker builds as build args
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN pnpm build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 2567
CMD ["node", "apps/server/dist/index.js"]
