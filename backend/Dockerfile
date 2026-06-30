# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Cache mount mempercepat rebuild berikutnya secara signifikan.
# Build pertama tetap lama karena compile semua package dari scratch.
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.21
WORKDIR /app
COPY --from=builder /app/server .
COPY config.yaml .
COPY migrations/ ./migrations/

# Loop 46: run as non-root user for defense-in-depth.
RUN adduser -D -H -g '' navisha
USER navisha

EXPOSE 8090
CMD ["./server"]