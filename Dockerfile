FROM node:20-alpine AS build

WORKDIR /repo
RUN mkdir -p /repo/app /repo/formpacks

COPY formpacks /repo/formpacks
COPY app/package.json app/package-lock.json /repo/app/

WORKDIR /repo/app
RUN npm ci

COPY app /repo/app
RUN npm run build

FROM dhi.io/nginx:1 AS runtime

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/app/dist /usr/share/nginx/html
