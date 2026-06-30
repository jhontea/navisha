# Navisha Backend — Makefile
.PHONY: help build test test-verbose lint fmt clean run migrate docker-build docker-run

help: ## Show this help message
	@echo "Navisha Backend — Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the server binary
	go build -o bin/server ./cmd/server

build-migrate: ## Build the migrate binary
	go build -o bin/migrate ./cmd/migrate

test: ## Run all tests
	go test ./...

test-verbose: ## Run all tests with verbose output
	go test -v ./...

test-coverage: ## Run tests with coverage report
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

lint: ## Run golangci-lint (requires golangci-lint to be installed)
	@command -v golangci-lint >/dev/null 2>&1 || { echo "golangci-lint not installed. Install: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; exit 1; }
	golangci-lint run ./...

fmt: ## Format Go code
	go fmt ./...

vet: ## Run go vet
	go vet ./...

tidy: ## Tidy go modules
	go mod tidy

clean: ## Remove build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html

run: build ## Build and run the server
	./bin/server

migrate: build-migrate ## Build and run migrations
	./bin/migrate

migrate-status: build-migrate ## Show pending migrations
	./bin/migrate -status

docker-build: ## Build Docker image
	docker build -t navisha-backend:latest .

docker-run: ## Run Docker container
	docker run -p 8090:8090 --env-file .env navisha-backend:latest

dev: ## Run server in development mode (with hot reload via air if installed)
	@command -v air >/dev/null 2>&1 || { echo "air not installed. Install: go install github.com/air-verse/air@latest"; exit 1; }
	air

.DEFAULT_GOAL := help