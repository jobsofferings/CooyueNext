FROM node:22-alpine

RUN apk add --no-cache \
    bash \
    git \
    docker-cli \
    docker-cli-compose

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./
COPY deploy.sh ./
RUN chmod +x deploy.sh

RUN mkdir -p logs

EXPOSE 9000

CMD ["node", "server.js"]
