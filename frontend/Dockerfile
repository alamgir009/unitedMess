FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV VITE_API_URL=https://api.unitedmess.uk

RUN npm run build

FROM nginx:stable-alpine AS runner

RUN apk add --no-cache tzdata

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
