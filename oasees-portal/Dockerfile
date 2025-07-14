FROM node:21-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /oasees-portal
COPY ./oasees_portal/public/ /oasees-portal/public
COPY ./oasees_portal/src/ /oasees-portal/src
COPY ./oasees_portal/package.json /oasees-portal/package.json
COPY ./oasees_portal/tsconfig.json /oasees-portal/tsconfig.json
COPY ./oasees_portal/.eslintrc.json /oasees-portal/.eslintrc.json
COPY ./oasees_portal/craco.config.js /oasees-portal/craco.config.js
RUN npm install

EXPOSE 3000