FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY agent_class.py /app
COPY agent.py /app
COPY dao_event_watcher.py /app
COPY utils.py /app

CMD ["python", "agent.py"]