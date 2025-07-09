FROM --platform=$BUILDPLATFORM golang:1.20-alpine AS builder

RUN apk add --no-cache git build-base

WORKDIR /app

COPY . .

ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

RUN rm -f go.mod go.sum && \
    go mod init device-plugin && \
    go get github.com/fsnotify/fsnotify@v1.6.0 && \
    go get github.com/golang/glog@v1.1.0 && \
    go get google.golang.org/grpc@v1.59.0 && \
    go get k8s.io/kubelet@v0.28.0 && \
    go mod tidy

RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -a -installsuffix cgo -o device-plugin .

FROM alpine:3.18

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/device-plugin /usr/local/bin/device-plugin

ENTRYPOINT ["/usr/local/bin/device-plugin"]