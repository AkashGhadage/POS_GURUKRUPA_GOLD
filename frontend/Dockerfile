FROM node:18-alpine

# Install Rust using Alpine's package manager
RUN apk add --no-cache rust cargo

WORKDIR /app
COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
