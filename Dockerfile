FROM node:20-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --production

# Copy app files
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
