# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Force IPv4-only DNS resolution.
# Some VPS have IPv6 addresses configured but no actual IPv6 connectivity,
# causing Go's default DNS resolver to try AAAA records and fail.
ENV GOPROXY=https://goproxy.io,direct
ENV GONOSUMCHECK=*

# Install git — required by go mod download for some VCS-based modules
RUN apk add --no-cache git

# Download dependencies with cache mount (BuildKit)
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy source and build
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
      -ldflags='-s -w' \
      -trimpath \
      -o server \
      ./cmd/server

# Runtime stage — distroless: no shell, minimal attack surface
FROM gcr.io/distroless/static-debian12

WORKDIR /app

COPY --from=builder /app/server .
COPY config.yaml .

EXPOSE 8090

CMD ["./server"]
