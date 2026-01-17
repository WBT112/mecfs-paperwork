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
RUN apt-get update && apt-get install -y curl ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN LIBS=$(ldd /usr/bin/curl | awk '/=>/ {print $3} /ld-linux/ {print $1}' | grep -v 'linux-vdso' | sort | uniq) \
    && tar -C / -chf /curl-deps.tar /usr/bin/curl /etc/ssl/certs/ca-certificates.crt $LIBS

FROM dhi.io/nginx:1 AS runtime
COPY --from=curl_installer /curl-deps.tar /curl-deps.tar
RUN tar -xf /curl-deps.tar -C / && rm /curl-deps.tar

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/app/dist /usr/share/nginx/html/
