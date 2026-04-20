FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--watch-options", "--poll=1000"]

