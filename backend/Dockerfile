# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

# Copy vendored dependencies first (no network needed)
# Run `go mod vendor` locally before building
COPY go.mod go.sum ./
COPY vendor/ ./vendor/

# Copy source and build using vendor (fully offline)
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
      -mod=vendor \
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
