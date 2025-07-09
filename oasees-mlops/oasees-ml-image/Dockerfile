FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1

# Install system dependencies and IPFS in one layer
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/* \
    && ARCH=$(uname -m) \
    && case "$ARCH" in \
        x86_64|amd64) KUBO_ARCH="linux-amd64" ;; \
        aarch64|arm64) KUBO_ARCH="linux-arm64" ;; \
        *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac \
    && KUBO_URL="https://dist.ipfs.tech/kubo/v0.30.0/kubo_v0.30.0_${KUBO_ARCH}.tar.gz" \
    && curl -L "$KUBO_URL" | tar -xzf - \
    && chmod +x kubo/ipfs \
    && cp kubo/ipfs /usr/local/bin/ \
    && rm -rf kubo

# Create user
RUN useradd -m -u 1000 oasees && \
    mkdir -p /home/oasees/.ipfs && \
    chown -R oasees:oasees /home/oasees

WORKDIR /app

# Copy and install requirements
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

RUN chown -R oasees:oasees /app

USER oasees