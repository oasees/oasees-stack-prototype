FROM python:3.9-slim

RUN apt-get update && \
    apt-get install -y \
    curl \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /oasees
COPY /src/requirements.txt /requirements.txt



RUN pip install --no-cache-dir -r ../requirements.txt
RUN brownie pm install OpenZeppelin/openzeppelin-contracts@4.7.3
RUN brownie init

COPY /src/app.py /oasees/app.py
COPY /src/sqlite_utils.py /oasees/sqlite_utils.py
COPY /src/contracts /oasees/contracts
COPY /src/scripts /oasees/scripts
COPY /src/brownie-config.yaml /oasees/brownie-config.yaml

RUN brownie compile
 
CMD ["python", "app.py"]

