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

COPY compiled_contracts/ compiled_contracts 
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py agent.py
COPY dao_event_watcher.py dao_event_watcher.py
COPY sqlite_utils.py sqlite_utils.py

CMD ["python", "agent.py"]

