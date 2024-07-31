FROM node:21-alpine
WORKDIR /oasees_portal
COPY public/ /oasees_portal/public
COPY src/ /oasees_portal/src
COPY package.json /oasees_portal/package.json
COPY tsconfig.json /oasees_portal/tsconfig.json
COPY .eslintrc.json /oasees_portal/.eslintrc.json
COPY craco.config.js /oasees_portal/craco.config.js
RUN npm install
