#!/bin/bash
k3d cluster create ipfs-cluster1 --api-port 6443 --port "30401:30401@server:0" --port "30880:30880@server:0" --port "30501:30501@server:0"

k3d cluster create ipfs-cluster2 --api-port 6444 --port "31401:31401@server:0" --port "31880:31880@server:0" --port "31501:31501@server:0"


kubectl config use-context k3d-ipfs-cluster1
kubectl apply -f node1_ipfs.yaml
sleep 5
kubectl wait --for=condition=Ready pods -l app=ipfs-kubo --timeout=120s


kubectl config use-context k3d-ipfs-cluster2
kubectl apply -f node2_ipfs.yaml
sleep 5
kubectl wait --for=condition=Ready pods -l app=ipfs-kubo --timeout=120s



set -e
TEST_RESULTS_FILE="ipfs_test_results.log"
echo "IPFS Cluster Test Results - $(date)" > $TEST_RESULTS_FILE

# Global timeout settings
COMMAND_TIMEOUT=30
TEST_TIMEOUT=180

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to log test results
log_test() {
  local test_name=$1
  local result=$2
  local details=$3
  
  echo -e "${test_name}: ${result}" | tee -a $TEST_RESULTS_FILE
  if [ ! -z "$details" ]; then
    echo -e "${details}" | tee -a $TEST_RESULTS_FILE
  fi
  echo "" | tee -a $TEST_RESULTS_FILE
}

# Function to initialize test environment
initialize() {
  echo -e "${YELLOW}Initializing test environment...${NC}"
  
  # Get pod names from each cluster with retries
  kubectl config use-context k3d-ipfs-cluster1
  echo "Getting pod information from cluster 1..."
  RETRY=0
  MAX_RETRIES=10
  
  while [ $RETRY -lt $MAX_RETRIES ]; do
    POD1=$(kubectl get pods -l app=ipfs-kubo -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$POD1" ]; then
      echo "Found pod in cluster 1: $POD1"
      break
    fi
    RETRY=$((RETRY+1))
    echo "Waiting for pods in cluster 1... ($RETRY/$MAX_RETRIES)"
    sleep 5
  done
  
  if [ -z "$POD1" ]; then
    echo -e "${RED}Failed to find IPFS pod in cluster 1${NC}"
    exit 1
  fi
  
  # Wait for IPFS daemon to be ready in cluster 1
  echo "Waiting for IPFS daemon in cluster 1..."
  RETRY=0
  while [ $RETRY -lt $MAX_RETRIES ]; do
    SWARM_ID1=$(kubectl exec $POD1 -- ipfs id -f='<id>' 2>/dev/null || echo "")
    if [ -n "$SWARM_ID1" ]; then
      echo "IPFS daemon in cluster 1 is ready. ID: $SWARM_ID1"
      break
    fi
    RETRY=$((RETRY+1))
    echo "Waiting for IPFS daemon in cluster 1... ($RETRY/$MAX_RETRIES)"
    sleep 5
  done
  
  if [ -z "$SWARM_ID1" ]; then
    echo -e "${RED}IPFS daemon in cluster 1 is not responding${NC}"
    exit 1
  fi
  
  # Repeat for cluster 2
  kubectl config use-context k3d-ipfs-cluster2
  echo "Getting pod information from cluster 2..."
  RETRY=0
  
  while [ $RETRY -lt $MAX_RETRIES ]; do
    POD2=$(kubectl get pods -l app=ipfs-kubo -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$POD2" ]; then
      echo "Found pod in cluster 2: $POD2"
      break
    fi
    RETRY=$((RETRY+1))
    echo "Waiting for pods in cluster 2... ($RETRY/$MAX_RETRIES)"
    sleep 5
  done
  
  if [ -z "$POD2" ]; then
    echo -e "${RED}Failed to find IPFS pod in cluster 2${NC}"
    exit 1
  fi
  
  # Wait for IPFS daemon to be ready in cluster 2
  echo "Waiting for IPFS daemon in cluster 2..."
  RETRY=0
  while [ $RETRY -lt $MAX_RETRIES ]; do
    SWARM_ID2=$(kubectl exec $POD2 -- ipfs id -f='<id>' 2>/dev/null || echo "")
    if [ -n "$SWARM_ID2" ]; then
      echo "IPFS daemon in cluster 2 is ready. ID: $SWARM_ID2"
      break
    fi
    RETRY=$((RETRY+1))
    echo "Waiting for IPFS daemon in cluster 2... ($RETRY/$MAX_RETRIES)"
    sleep 5
  done
  
  if [ -z "$SWARM_ID2" ]; then
    echo -e "${RED}IPFS daemon in cluster 2 is not responding${NC}"
    exit 1
  fi
  
  # Get host IP (for connections between clusters)
  HOST_IP=$(hostname -I | awk '{print $1}')
  if [ -z "$HOST_IP" ]; then
    # Fallback to other methods if hostname -I doesn't work
    HOST_IP=$(ip route get 1 | awk '{print $7}' | head -1)
  fi
  
  if [ -z "$HOST_IP" ]; then
    echo -e "${RED}Failed to determine host IP address${NC}"
    exit 1
  fi
  
  echo -e "Cluster 1 pod: ${YELLOW}$POD1${NC}"
  echo -e "Cluster 1 IPFS ID: ${YELLOW}$SWARM_ID1${NC}"
  echo -e "Cluster 2 pod: ${YELLOW}$POD2${NC}"
  echo -e "Cluster 2 IPFS ID: ${YELLOW}$SWARM_ID2${NC}"
  echo -e "Host IP: ${YELLOW}$HOST_IP${NC}"
  echo ""
  
  # Export variables for use in tests
  export POD1 SWARM_ID1 POD2 SWARM_ID2 HOST_IP
}

#=========== TEST FUNCTIONS ===========

# Test 1: Basic Swarm Peer Connection
test_swarm_connection() {
  echo -e "${YELLOW}Running Test 1: Basic Swarm Peer Connection${NC}"
  
  # Connect nodes (if not already connected)
  kubectl config use-context k3d-ipfs-cluster1
  timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs swarm connect /ip4/$HOST_IP/tcp/31401/p2p/$SWARM_ID2 || true
  
  kubectl config use-context k3d-ipfs-cluster2
  timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs swarm connect /ip4/$HOST_IP/tcp/30401/p2p/$SWARM_ID1 || true
  
  # Check connections
  sleep 5
  kubectl config use-context k3d-ipfs-cluster1
  CONN1=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs swarm peers | grep $SWARM_ID2 || echo "")
  
  kubectl config use-context k3d-ipfs-cluster2
  CONN2=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs swarm peers | grep $SWARM_ID1 || echo "")
  
  if [ -n "$CONN1" ] && [ -n "$CONN2" ]; then
    log_test "Swarm Connection Test" "${GREEN}PASSED${NC}" "Both clusters can connect to each other"
  elif [ -n "$CONN1" ]; then
    log_test "Swarm Connection Test" "${YELLOW}PARTIAL${NC}" "Cluster 1 can connect to Cluster 2, but not vice versa"
  elif [ -n "$CONN2" ]; then
    log_test "Swarm Connection Test" "${YELLOW}PARTIAL${NC}" "Cluster 2 can connect to Cluster 1, but not vice versa"
  else
    log_test "Swarm Connection Test" "${RED}FAILED${NC}" "No connection established between clusters"
  fi
}

# Test 2: Connection Stability
test_connection_stability() {
  echo -e "${YELLOW}Running Test 2: Connection Stability${NC}"
  
  local stable_count=0
  local test_iterations=3  # Reduced for faster testing
  local sleep_seconds=5
  
  echo "Testing connection stability over $test_iterations checks with ${sleep_seconds}s intervals..."
  
  for i in $(seq 1 $test_iterations); do
    kubectl config use-context k3d-ipfs-cluster1
    PEERS1=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs swarm peers | wc -l)
    CONN1=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs swarm peers | grep $SWARM_ID2 || echo "")
    
    kubectl config use-context k3d-ipfs-cluster2
    PEERS2=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs swarm peers | wc -l)
    CONN2=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs swarm peers | grep $SWARM_ID1 || echo "")
    
    echo "Check $i: Cluster1 peers: $PEERS1, Cluster2 peers: $PEERS2"
    
    if [ -n "$CONN1" ] && [ -n "$CONN2" ]; then
      ((stable_count++))
    fi
    
    if [ $i -lt $test_iterations ]; then
      sleep $sleep_seconds
    fi
  done
  
  if [ $stable_count -eq $test_iterations ]; then
    log_test "Connection Stability Test" "${GREEN}PASSED${NC}" "Connection remained stable across all $test_iterations checks"
  elif [ $stable_count -gt 0 ]; then
    log_test "Connection Stability Test" "${YELLOW}PARTIAL${NC}" "Connection was stable for $stable_count/$test_iterations checks"
  else
    log_test "Connection Stability Test" "${RED}FAILED${NC}" "Connection was not stable for any checks"
  fi
}

# Test 3: Small File Exchange
test_small_file_exchange() {
  echo -e "${YELLOW}Running Test 3: Small File Exchange${NC}"
  
  # Create and add small file on cluster 1
  kubectl config use-context k3d-ipfs-cluster1
  echo "Small test file content - $(date)" | timeout $COMMAND_TIMEOUT kubectl exec -i $POD1 -- tee /tmp/small-test.txt >/dev/null
  SMALL_HASH=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs add -q /tmp/small-test.txt)
  ORIGINAL_CONTENT=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- cat /tmp/small-test.txt)
  
  if [ -z "$SMALL_HASH" ]; then
    log_test "Small File Exchange Test" "${RED}FAILED${NC}" "Failed to add file to IPFS on cluster 1"
    return
  fi
  
  echo "File added to IPFS with hash: $SMALL_HASH"
  
  # Retrieve file on cluster 2
  kubectl config use-context k3d-ipfs-cluster2
  # Allow some time for DHT propagation
  sleep 5
  
  # Try to get the file
  if timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs get $SMALL_HASH -o /tmp/retrieved-small.txt; then
    RETRIEVED_CONTENT=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- cat /tmp/retrieved-small.txt)
    
    if [ "$ORIGINAL_CONTENT" == "$RETRIEVED_CONTENT" ]; then
      log_test "Small File Exchange Test" "${GREEN}PASSED${NC}" "File successfully transferred with hash: $SMALL_HASH"
    else
      log_test "Small File Exchange Test" "${RED}FAILED${NC}" "File content mismatch"
    fi
  else
    log_test "Small File Exchange Test" "${RED}FAILED${NC}" "Could not retrieve file from cluster 2"
  fi
}

# Test 4: Large File Exchange
test_large_file_exchange() {
  echo -e "${YELLOW}Running Test 4: Large File Exchange${NC}"
  
  # Create and add large file on cluster 2
  kubectl config use-context k3d-ipfs-cluster2
  # Create a 5MB file (smaller for faster testing)
  timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- dd if=/dev/urandom of=/tmp/large-test.bin bs=1M count=5 2>/dev/null
  
  # Get file size and checksum
  ORIGINAL_SIZE=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- stat -c %s /tmp/large-test.bin)
  ORIGINAL_MD5=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- md5sum /tmp/large-test.bin | awk '{print $1}')
  
  echo "Created test file of size $ORIGINAL_SIZE bytes with MD5 $ORIGINAL_MD5"
  
  # Add to IPFS
  LARGE_HASH=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs add -q /tmp/large-test.bin)
  
  if [ -z "$LARGE_HASH" ]; then
    log_test "Large File Exchange Test" "${RED}FAILED${NC}" "Failed to add large file to IPFS on cluster 2"
    return
  fi
  
  echo "File added to IPFS with hash: $LARGE_HASH"
  
  # Retrieve file on cluster 1
  kubectl config use-context k3d-ipfs-cluster1
  # Allow some time for DHT propagation
  sleep 5
  
  echo "Retrieving file on cluster 1..."
  START_TIME=$(date +%s)
  
  if timeout 60 kubectl exec $POD1 -- ipfs get $LARGE_HASH -o /tmp/retrieved-large.bin; then
    END_TIME=$(date +%s)
    TRANSFER_TIME=$((END_TIME - START_TIME))
    
    RETRIEVED_SIZE=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- stat -c %s /tmp/retrieved-large.bin)
    RETRIEVED_MD5=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- md5sum /tmp/retrieved-large.bin | awk '{print $1}')
    
    if [ "$ORIGINAL_MD5" == "$RETRIEVED_MD5" ]; then
      SPEED_MBS=$(echo "scale=2; $RETRIEVED_SIZE / 1048576 / $TRANSFER_TIME" | bc)
      log_test "Large File Exchange Test" "${GREEN}PASSED${NC}" "File successfully transferred\nSize: $RETRIEVED_SIZE bytes\nMD5: $RETRIEVED_MD5\nTransfer time: ${TRANSFER_TIME}s\nTransfer speed: ${SPEED_MBS} MB/s"
    else
      log_test "Large File Exchange Test" "${RED}FAILED${NC}" "File content mismatch\nOriginal MD5: $ORIGINAL_MD5\nRetrieved MD5: $RETRIEVED_MD5"
    fi
  else
    log_test "Large File Exchange Test" "${RED}FAILED${NC}" "Could not retrieve file from cluster 1"
  fi
}

# Test 5: Content Discovery Time
test_content_discovery() {
  echo -e "${YELLOW}Running Test 5: Content Discovery Time${NC}"
  
  # Add content on cluster 1
  kubectl config use-context k3d-ipfs-cluster1
  echo "Discovery test content - $(date)" | timeout $COMMAND_TIMEOUT kubectl exec -i $POD1 -- tee /tmp/discovery.txt >/dev/null
  DISC_HASH=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs add -q /tmp/discovery.txt)
  
  if [ -z "$DISC_HASH" ]; then
    log_test "Content Discovery Test" "${RED}FAILED${NC}" "Failed to add test content to IPFS"
    return
  fi
  
  echo "Content added with hash: $DISC_HASH"
  
  # Time how long it takes for cluster 2 to discover and retrieve
  kubectl config use-context k3d-ipfs-cluster2
  
  # Clear IPFS cache first to ensure fair test
  timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs repo gc >/dev/null 2>&1 || true
  
  echo "Testing discovery time..."
  START_TIME=$(date +%s.%N)
  
  if timeout 60 kubectl exec $POD2 -- ipfs get $DISC_HASH -o /tmp/discovered.txt; then
    END_TIME=$(date +%s.%N)
    DISC_TIME=$(echo "$END_TIME - $START_TIME" | bc)
    DISC_TIME_ROUNDED=$(printf "%.2f" $DISC_TIME)
    
    log_test "Content Discovery Test" "${GREEN}PASSED${NC}" "Content discovered and retrieved in $DISC_TIME_ROUNDED seconds\nContent hash: $DISC_HASH"
  else
    log_test "Content Discovery Test" "${RED}FAILED${NC}" "Failed to discover content within timeout period"
  fi
}

# Test 6: Connection Recovery
test_connection_recovery() {
  echo -e "${YELLOW}Running Test 6: Connection Recovery${NC}"
  
  # Ensure nodes are connected first
  kubectl config use-context k3d-ipfs-cluster1
  timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs swarm connect /ip4/$HOST_IP/tcp/31401/p2p/$SWARM_ID2 || true
  sleep 2
  
  # Verify initial connection
  INITIAL_CONN=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs swarm peers | grep $SWARM_ID2 || echo "")
  
  if [ -z "$INITIAL_CONN" ]; then
    log_test "Connection Recovery Test" "${RED}FAILED${NC}" "Could not establish initial connection"
    return
  fi
  
  echo "Initial connection established, breaking connection..."
  
  # Break connection by restarting the pod
  timeout $COMMAND_TIMEOUT kubectl delete pod $POD1 --wait=false
  
  # Wait for pod to be deleted and recreated
  echo "Waiting for pod to restart..."
  sleep 5
  timeout 60 kubectl wait --for=condition=Ready pod -l app=ipfs-kubo --timeout=60s
  
  # Get new pod details
  POD1=$(timeout $COMMAND_TIMEOUT kubectl get pods -l app=ipfs-kubo -o jsonpath='{.items[0].metadata.name}')
  SWARM_ID1=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs id -f='<id>')
  export POD1 SWARM_ID1
  
  echo "Pod restarted. New pod name: $POD1, new IPFS ID: $SWARM_ID1"
  
  # Try to re-establish connection
  sleep 10 # Give some time for the pod to initialize
  
  kubectl config use-context k3d-ipfs-cluster2
  echo "Attempting to reconnect from cluster 2 to cluster 1..."
  timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs swarm connect /ip4/$HOST_IP/tcp/30401/p2p/$SWARM_ID1
  
  # Verify connection
  sleep 5
  RECOVERED_CONN=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs swarm peers | grep $SWARM_ID1 || echo "")
  
  if [ -n "$RECOVERED_CONN" ]; then
    log_test "Connection Recovery Test" "${GREEN}PASSED${NC}" "Connection successfully recovered after pod restart"
  else
    log_test "Connection Recovery Test" "${RED}FAILED${NC}" "Failed to recover connection after pod restart"
  fi
}

# Test 7: Bidirectional Exchange
test_bidirectional_exchange() {
  echo -e "${YELLOW}Running Test 7: Bidirectional Exchange${NC}"
  
  # Create files on both clusters simultaneously
  kubectl config use-context k3d-ipfs-cluster1
  timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- dd if=/dev/urandom of=/tmp/file1.bin bs=1M count=3 2>/dev/null
  HASH1=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- ipfs add -q /tmp/file1.bin)
  MD5_1=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- md5sum /tmp/file1.bin | awk '{print $1}')
  
  kubectl config use-context k3d-ipfs-cluster2
  timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- dd if=/dev/urandom of=/tmp/file2.bin bs=1M count=3 2>/dev/null
  HASH2=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- ipfs add -q /tmp/file2.bin)
  MD5_2=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- md5sum /tmp/file2.bin | awk '{print $1}')
  
  echo "Created file on cluster 1 with hash: $HASH1"
  echo "Created file on cluster 2 with hash: $HASH2"
  
  # Wait for DHT propagation
  sleep 5
  
  # Retrieve files in both directions
  echo "Retrieving files bidirectionally..."
  
  # Cluster 2 gets file from cluster 1
  kubectl config use-context k3d-ipfs-cluster2
  timeout 60 kubectl exec $POD2 -- ipfs get $HASH1 -o /tmp/retrieved1.bin
  MD5_RETRIEVED_1=$(timeout $COMMAND_TIMEOUT kubectl exec $POD2 -- md5sum /tmp/retrieved1.bin | awk '{print $1}')
  
  # Cluster 1 gets file from cluster 2
  kubectl config use-context k3d-ipfs-cluster1
  timeout 60 kubectl exec $POD1 -- ipfs get $HASH2 -o /tmp/retrieved2.bin
  MD5_RETRIEVED_2=$(timeout $COMMAND_TIMEOUT kubectl exec $POD1 -- md5sum /tmp/retrieved2.bin | awk '{print $1}')
  
  # Check results
  RESULT1=$([ "$MD5_1" == "$MD5_RETRIEVED_1" ] && echo "Success" || echo "Failure")
  RESULT2=$([ "$MD5_2" == "$MD5_RETRIEVED_2" ] && echo "Success" || echo "Failure")
  
  if [ "$RESULT1" == "Success" ] && [ "$RESULT2" == "Success" ]; then
    log_test "Bidirectional Exchange Test" "${GREEN}PASSED${NC}" "Both files successfully transferred in both directions\nFile 1 hash: $HASH1\nFile 2 hash: $HASH2"
  elif [ "$RESULT1" == "Success" ]; then
    log_test "Bidirectional Exchange Test" "${YELLOW}PARTIAL${NC}" "Cluster 1 → Cluster 2: Success\nCluster 2 → Cluster 1: Failure"
  elif [ "$RESULT2" == "Success" ]; then
    log_test "Bidirectional Exchange Test" "${YELLOW}PARTIAL${NC}" "Cluster 1 → Cluster 2: Failure\nCluster 2 → Cluster 1: Success"
  else
    log_test "Bidirectional Exchange Test" "${RED}FAILED${NC}" "Failed to transfer files in both directions"
  fi
}

# Run a test with a timeout
run_test_with_timeout() {
  local test_name=$1
  local max_time=$2
  
  echo -e "${YELLOW}Running test with ${max_time}s timeout: $test_name${NC}"
  
  # Run the test with timeout
  timeout $max_time $test_name
  
  # Check exit status
  local status=$?
  if [ $status -eq 124 ]; then
    log_test "$test_name" "${RED}TIMED OUT${NC}" "Test exceeded ${max_time}s time limit"
  fi
}

# Main function to run all tests
run_all_tests() {
  # Set trap for proper exit
  trap 'echo -e "${YELLOW}Tests interrupted. Exiting...${NC}"; exit' INT TERM
  
  initialize
  
  echo -e "${YELLOW}Starting IPFS dual cluster tests...${NC}"
  echo -e "${YELLOW}===============================${NC}"
  
  test_swarm_connection
  test_small_file_exchange
  test_large_file_exchange
  test_bidirectional_exchange
  test_connection_recovery


  
  echo -e "${YELLOW}===============================${NC}"
  echo -e "${YELLOW}All tests completed. Results summary:${NC}"
  cat $TEST_RESULTS_FILE | grep -E 'Test:.*(PASSED|PARTIAL|FAILED|TIMED OUT)'
  echo -e "${YELLOW}Complete test results saved to: ${NC}$TEST_RESULTS_FILE"
}

# Run all tests
run_all_tests
echo -e "${GREEN}All tests completed. Exiting script.${NC}"
exit 0