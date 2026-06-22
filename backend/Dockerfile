FROM golang:1.25.6-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.21
WORKDIR /app
COPY --from=builder /app/server .
COPY config.yaml .
EXPOSE 8090
CMD ["./server"]
