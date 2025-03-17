#!/bin/bash

# Exit on error
set -e

echo "Creating dedicated Docker network for Submariner..."
docker network create submariner-net || true

echo "Creating k3d clusters..."
# Create cluster1 (broker)
k3d cluster create cluster1 \
    --api-port 6443 \
    --servers 1 \
    --agents 2 \
    --port "8081:80@loadbalancer" \
    --k3s-arg "--cluster-cidr=10.10.0.0/16@server:0" \
    --k3s-arg "--service-cidr=10.11.0.0/16@server:0" \
    --network submariner-net

# Create cluster2
k3d cluster create cluster2 \
    --api-port 6444 \
    --servers 1 \
    --agents 2 \
    --port "8082:80@loadbalancer" \
    --k3s-arg "--cluster-cidr=10.20.0.0/16@server:0" \
    --k3s-arg "--service-cidr=10.21.0.0/16@server:0" \
    --network submariner-net

echo "Installing subctl..."
curl -Ls https://get.submariner.io | bash

echo "Setting up environment variables..."
export BROKER_NS=submariner-k8s-broker
export SUBMARINER_NS=submariner-operator
export SUBMARINER_PSK=$(LC_CTYPE=C tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 64 | head -n 1)

# Switch to broker cluster (cluster1)
export KUBECONFIG=$(k3d kubeconfig write cluster1)

echo "Adding Submariner Helm repository..."
helm repo add submariner-latest https://submariner-io.github.io/submariner-charts/charts/
helm repo update

echo "Installing the broker on cluster1..."
helm install "${BROKER_NS}" submariner-latest/submariner-k8s-broker \
    --create-namespace \
    --namespace "${BROKER_NS}"

echo "Getting broker details..."
export SUBMARINER_BROKER_CA=$(kubectl -n "${BROKER_NS}" get secrets \
    -o jsonpath="{.items[?(@.metadata.annotations['kubernetes\.io/service-account\.name']=='${BROKER_NS}-client')].data['ca\.crt']}")
export SUBMARINER_BROKER_TOKEN=$(kubectl -n "${BROKER_NS}" get secrets \
    -o jsonpath="{.items[?(@.metadata.annotations['kubernetes\.io/service-account\.name']=='${BROKER_NS}-client')].data.token}" \
    | base64 --decode)

# Use the correct broker API server URL
export SUBMARINER_BROKER_URL="172.21.0.2:6443"

echo "Joining cluster1 (broker cluster)..."
helm install submariner-operator submariner-latest/submariner-operator \
    --create-namespace \
    --namespace "${SUBMARINER_NS}" \
    --set ipsec.psk="${SUBMARINER_PSK}" \
    --set broker.server="${SUBMARINER_BROKER_URL}" \
    --set broker.token="${SUBMARINER_BROKER_TOKEN}" \
    --set broker.namespace="${BROKER_NS}" \
    --set broker.ca="${SUBMARINER_BROKER_CA}" \
    --set broker.globalnet=true \
    --set submariner.serviceDiscovery=true \
    --set submariner.cableDriver=libreswan \
    --set submariner.clusterId=cluster1 \
    --set submariner.clusterCidr=10.10.0.0/16 \
    --set submariner.serviceCidr=10.11.0.0/16 \
    --set submariner.globalCidr=242.1.0.0/16 \
    --set submariner.natEnabled=true \
    --set broker.insecure=true \
    --set serviceAccounts.globalnet.create=true \
    --set serviceAccounts.lighthouseAgent.create=true \
    --set serviceAccounts.lighthouseCoreDns.create=true \
    --set submariner.brokerK8sApiServer="${SUBMARINER_BROKER_URL}" \
    --set submariner.brokerK8sInsecure=true

echo "Joining cluster2..."
export KUBECONFIG=$(k3d kubeconfig write cluster2)
helm install submariner-operator submariner-latest/submariner-operator \
    --create-namespace \
    --namespace "${SUBMARINER_NS}" \
    --set ipsec.psk="${SUBMARINER_PSK}" \
    --set broker.server="${SUBMARINER_BROKER_URL}" \
    --set broker.token="${SUBMARINER_BROKER_TOKEN}" \
    --set broker.namespace="${BROKER_NS}" \
    --set broker.ca="${SUBMARINER_BROKER_CA}" \
    --set broker.globalnet=true \
    --set submariner.serviceDiscovery=true \
    --set submariner.cableDriver=libreswan \
    --set submariner.clusterId=cluster2 \
    --set submariner.clusterCidr=10.20.0.0/16 \
    --set submariner.serviceCidr=10.21.0.0/16 \
    --set submariner.globalCidr=242.2.0.0/16 \
    --set submariner.natEnabled=true \
    --set broker.insecure=true \
    --set serviceAccounts.globalnet.create=true \
    --set serviceAccounts.lighthouseAgent.create=true \
    --set serviceAccounts.lighthouseCoreDns.create=true \
    --set submariner.brokerK8sApiServer="${SUBMARINER_BROKER_URL}" \
    --set submariner.brokerK8sInsecure=true

echo "Setting up gateway nodes..."
# Label nodes in cluster1
export KUBECONFIG=$(k3d kubeconfig write cluster1)
kubectl get nodes --selector='!node-role.kubernetes.io/master' -o name | xargs -I {} kubectl label {} submariner.io/gateway=true

# Label nodes in cluster2
export KUBECONFIG=$(k3d kubeconfig write cluster2)
kubectl get nodes --selector='!node-role.kubernetes.io/master' -o name | xargs -I {} kubectl label {} submariner.io/gateway=true

echo "Waiting for pods to be ready..."
sleep 30

# echo "Verifying setup..."
KUBECONFIG=$(k3d kubeconfig write cluster1):$(k3d kubeconfig write cluster2) subctl verify --context k3d-cluster1 --tocontext k3d-cluster2 --only service-discovery,compliance,connectivity,basic-connectivity
