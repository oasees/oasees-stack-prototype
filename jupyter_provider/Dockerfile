FROM python:3.9-slim

ENV PORTAL_URL="10.150.0.151"
ENV INFRA_HOST="10.150.0.151"
ENV IPFS_HOST="10.150.0.151"
ENV PORTAL_PORT="3000"
ENV CONTAINER_PREFIX="oasees-notebook"


RUN apt-get update && \
    apt-get install -y \
    curl \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py app.py
COPY sqlite_utils.py sqlite_utils.py

CMD ["python", "app.py"]

