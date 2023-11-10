FROM python:3.9-slim


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

COPY monitor_flask.py monitor_flask.py

CMD ["python", "monitor_flask.py"]

