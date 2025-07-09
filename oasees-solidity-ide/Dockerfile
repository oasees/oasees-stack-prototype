FROM python:3.11-slim

ENV NODE_VERSION=22.11.0
ENV NVM_DIR=/root/.nvm
ENV PATH="${NVM_DIR}/versions/node/v${NODE_VERSION}/bin:${PATH}"

RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p ${NVM_DIR} \
    && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \
    && . ${NVM_DIR}/nvm.sh \
    && nvm install ${NODE_VERSION} \
    && nvm alias default ${NODE_VERSION} \
    && nvm use default \
    && npm install -g npm@latest

RUN python --version && node --version && npm --version


WORKDIR /app

COPY ./app .
RUN pip install -r requirements.txt

CMD ["python","app.py"]
