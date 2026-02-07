FROM node:24-bookworm-slim AS build

# Build arguments for environment-specific configuration
ARG VITE_MODE=production
ARG VITE_SHOW_DEV_FORMPACKS=
ARG VITE_DEPLOYMENT_ENV=
ARG VITE_PUBLIC_ORIGIN=
ARG VITE_APP_VERSION=unknown
ARG VITE_BUILD_DATE=

WORKDIR /repo
RUN mkdir -p /repo/app /repo/.github
COPY .github/FUNDING.yml /repo/.github/FUNDING.yml
COPY app/package.json app/package-lock.json /repo/app/

WORKDIR /repo/app
RUN npm ci

COPY app /repo/app
COPY tools /repo/tools

# Pass build args as environment variables for Vite
ENV VITE_SHOW_DEV_FORMPACKS=$VITE_SHOW_DEV_FORMPACKS
ENV VITE_DEPLOYMENT_ENV=$VITE_DEPLOYMENT_ENV
ENV VITE_PUBLIC_ORIGIN=$VITE_PUBLIC_ORIGIN
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_BUILD_DATE=$VITE_BUILD_DATE

# Build with the specified mode
RUN npm run build -- --mode $VITE_MODE

FROM dhi.io/nginx:1 AS runtime

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/app/dist /usr/share/nginx/html/
