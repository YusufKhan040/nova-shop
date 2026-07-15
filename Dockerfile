# Match the Node runtime used by this project. Alpine keeps the deployment image small.
FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public

# The SQLite database is created automatically here on the first start.
RUN mkdir -p /app/data && addgroup -S nova && adduser -S nova -G nova && chown -R nova:nova /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/app/data/nova-shop.db

USER nova
EXPOSE 8080

CMD ["node", "server.js"]
