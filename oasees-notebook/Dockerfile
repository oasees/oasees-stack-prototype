FROM python:3.10-slim as builder
# FROM jupyter/base-notebook:python-3.10

# Install build dependencies in builder stage
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY ./requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --user -r /tmp/requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Final stage - minimal runtime image
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Install runtime dependencies, kubectl, and IPFS with architecture detection
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/* \
    && ARCH=$(uname -m) \
    && case "$ARCH" in \
        x86_64|amd64) KUBECTL_ARCH="linux/amd64"; KUBO_ARCH="linux-amd64" ;; \
        aarch64|arm64) KUBECTL_ARCH="linux/arm64"; KUBO_ARCH="linux-arm64" ;; \
        *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/${KUBECTL_ARCH}/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/ \
    && KUBO_URL="https://dist.ipfs.tech/kubo/v0.30.0/kubo_v0.30.0_${KUBO_ARCH}.tar.gz" \
    && curl -L "$KUBO_URL" | tar -xzf - \
    && chmod +x kubo/ipfs \
    && cp kubo/ipfs /usr/local/bin/ \
    && rm -rf kubo \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Add local packages to PATH
ENV PATH=/root/.local/bin:$PATH

# Configure Jupyter
ENV JUPYTER_CONFIG_DIR=/etc/jupyter/
RUN mkdir -p /etc/jupyter/

WORKDIR /workspace

RUN echo "c.ServerApp.allow_origin = '*'\n\
c.ServerApp.frame_ancestors = '*'\n\
c.ServerApp.token = ''\n\
c.ServerApp.password = ''\n\
c.ServerApp.disable_check_xsrf = True\n\
c.ServerApp.tornado_settings = {'headers': {'Content-Security-Policy': \"frame-ancestors * 'self'\"}}\n\
c.ServerApp.terminado_settings = {'shell_command': ['/bin/bash']}" > /etc/jupyter/jupyter_server_config.py

ENV SHELL=/bin/bash

# Copy and set up init script
COPY init-oasees-notebook.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-oasees-notebook.sh

EXPOSE 8081
ENTRYPOINT ["/usr/local/bin/init-oasees-notebook.sh"]