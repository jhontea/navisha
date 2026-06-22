# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Force IPv4 Go module downloads.
# VPS dengan konfigurasi IPv6 tanpa konektivitas IPv6 akan hang di DNS AAAA lookup.
# Solusi: paksa GODEBUG=netdns=go (pure Go resolver) + GOPROXY mirror IPv4-friendly.
# GONOSUMDB=* skip sum.golang.org DNS lookup.
ENV GOPROXY=off
ENV GONOSUMDB=*
ENV GODEBUG=netdns=go+1

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

# Pre-download dependencies menggunakan GOPROXY override per-run
# GOPROXY=off di ENV sengaja untuk catch jika ada dep yang belum di-cache
# Override saat download saja
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    GOPROXY=https://goproxy.io,https://goproxy.cn,direct \
    go mod download

# Copy source and build (fully offline setelah download)
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
