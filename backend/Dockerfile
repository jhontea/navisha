# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Force IPv4-only DNS resolution.
# Some VPS have IPv6 addresses configured but no actual IPv6 connectivity,
# causing Go's default DNS resolver to try AAAA records and fail.
# Using GOPROXY=https://goproxy.io as fallback avoids direct IPv6 lookups.
ENV GOPROXY=https://goproxy.io,direct
ENV GONOSUMCHECK=*

# Install git — required by go mod download for some VCS-based modules
RUN apk add --no-cache git

# Download dependencies first (cache layer)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags='-w -s' -o server ./cmd/server

# Runtime stage — use distroless for minimal secure image
# No apk needed, no shell, just the binary
FROM gcr.io/distroless/static-debian12

WORKDIR /app

COPY --from=builder /app/server .
COPY config.yaml .

EXPOSE 8090

CMD ["./server"]
