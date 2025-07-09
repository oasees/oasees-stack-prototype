FROM python:3.10-slim as builder

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

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Install only runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/ \
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