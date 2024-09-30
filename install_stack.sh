IMAGE="andreasoikonomakis/oasees-notebook:latest"
LOCAL_DIGEST=$(docker images --digests --format "{{.Digest}}" $IMAGE | head -n 1)
REMOTE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' $IMAGE 2>/dev/null || echo "Not Found")

if [ "$LOCAL_DIGEST" != "$REMOTE_DIGEST" ]; then
    echo "Digests differ or local image not found. Pulling image..."
    docker pull $IMAGE
else
    echo "Local image is up-to-date. No pull necessary."
fi
docker compose up --build -d
