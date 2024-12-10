FROM node:22-alpine

WORKDIR /hardhat

COPY hardhat.config.js /hardhat/
COPY package.json /hardhat/
RUN npm install
CMD ["npx", "hardhat", "node"]
