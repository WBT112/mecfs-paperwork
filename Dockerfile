FROM node:24-bookworm-slim AS build

WORKDIR /repo
RUN mkdir -p /repo/app /repo/formpacks

COPY formpacks /repo/formpacks
COPY app/package.json app/package-lock.json /repo/app/

WORKDIR /repo/app
RUN npm ci

COPY app /repo/app
RUN npm run build

FROM dhi.io/nginx:1-dev AS curl_installer
USER root
RUN apt-get update && apt-get install -y curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

FROM dhi.io/nginx:1 AS runtime
COPY --from=curl_installer /usr/bin/curl /usr/bin/curl

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/app/dist /usr/share/nginx/html/
