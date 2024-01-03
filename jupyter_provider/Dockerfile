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
COPY contract_functions.py contract_functions.py 
COPY requirements.txt .
COPY notebook/ notebook
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py app.py
COPY sqlite_utils.py sqlite_utils.py

CMD ["python", "app.py"]

