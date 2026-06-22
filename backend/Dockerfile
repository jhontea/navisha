# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Download dependencies first (cache layer)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags='-w -s' -o server ./cmd/server

# Runtime stage — copy ca-certs and tzdata from builder, no apk needed
FROM alpine:3.20

WORKDIR /app

# Copy ca-certificates and timezone data from the Go builder image
# This avoids needing network access during build on the VPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

COPY --from=builder /app/server .
COPY config.yaml .

EXPOSE 8090

CMD ["./server"]
