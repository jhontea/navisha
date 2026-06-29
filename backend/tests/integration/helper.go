package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/ahmadhafizh/navisha/backend/pkg/jwt"
)

// TestContext holds shared state for integration tests.
type TestContext struct {
	BaseURL    string
	Token      string
	UserID     string
	HTTPClient *http.Client
	TripID     string
	DayIDs     []string
}

// SetupConfig holds parsed configuration for tests.
type SetupConfig struct {
	JWTSecret        string
	JWTRefreshSecret string
	AccessTTL        int
	RefreshTTL       int
	BaseURL          string
	DatabaseURL      string
	UserID           string
	UserEmail        string
	UserName         string
	UserAvatarURL    string
}

// LoadSetupConfig reads configuration from environment variables (loaded from .env).
// Falls back to sensible defaults for local development.
func LoadSetupConfig() *SetupConfig {
	cfg := &SetupConfig{
		JWTSecret:        getEnv("JWT_SECRET", ""),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", ""),
		AccessTTL:        3600,
		RefreshTTL:       604800,
		BaseURL:          getEnv("BACKEND_URL", "http://localhost:8090/api/v1"),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		UserID:           getEnv("TEST_USER_ID", ""),
		UserEmail:        getEnv("TEST_USER_EMAIL", "integration-test@navisha.test"),
		UserName:         getEnv("TEST_USER_NAME", "Integration Test User"),
		UserAvatarURL:    getEnv("TEST_USER_AVATAR_URL", "https://example.com/avatar.png"),
	}

	// Generate a valid UUID if not provided
	if cfg.UserID == "" {
		cfg.UserID = "00000000-0000-4000-8000-000000000001"
	}

	return cfg
}

// getEnv returns the value of an environment variable or a default if not set.
func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

// NewTestContext creates a TestContext with a valid JWT token.
func NewTestContext(cfg *SetupConfig) *TestContext {
	jwtSvc := jwt.NewService(cfg.JWTSecret, cfg.JWTRefreshSecret, cfg.AccessTTL, cfg.RefreshTTL)
	token, err := jwtSvc.GenerateAccessToken(cfg.UserID)
	if err != nil {
		panic(fmt.Sprintf("failed to generate test JWT: %v", err))
	}

	return &TestContext{
		BaseURL: cfg.BaseURL,
		Token:   token,
		UserID:  cfg.UserID,
		HTTPClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// apiRequest performs an HTTP request with the test token.
func apiRequest(t *testing.T, ctx *TestContext, method, path string, body any) *http.Response {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, ctx.BaseURL+path, reqBody)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+ctx.Token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := ctx.HTTPClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	return resp
}

// apiGet is a convenience wrapper for GET requests.
func apiGet(t *testing.T, ctx *TestContext, path string) *http.Response {
	t.Helper()
	return apiRequest(t, ctx, http.MethodGet, path, nil)
}

// apiPost is a convenience wrapper for POST requests.
func apiPost(t *testing.T, ctx *TestContext, path string, body any) *http.Response {
	t.Helper()
	return apiRequest(t, ctx, http.MethodPost, path, body)
}

// apiPut is a convenience wrapper for PUT requests.
func apiPut(t *testing.T, ctx *TestContext, path string, body any) *http.Response {
	t.Helper()
	return apiRequest(t, ctx, http.MethodPut, path, body)
}

// apiDelete is a convenience wrapper for DELETE requests.
func apiDelete(t *testing.T, ctx *TestContext, path string) *http.Response {
	t.Helper()
	return apiRequest(t, ctx, http.MethodDelete, path, nil)
}

// assertStatus checks that the response has the expected HTTP status code.
func assertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	if resp.StatusCode != expected {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		t.Fatalf("expected status %d, got %d. Body: %s", expected, resp.StatusCode, string(body))
	}
}

// assertStatusAny checks that the response status is one of the expected codes.
func assertStatusAny(t *testing.T, resp *http.Response, expected ...int) {
	t.Helper()
	for _, e := range expected {
		if resp.StatusCode == e {
			return
		}
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	t.Fatalf("expected status one of %v, got %d. Body: %s", expected, resp.StatusCode, string(body))
}

// parseBody decodes the JSON response body into the given target.
func parseBody(t *testing.T, resp *http.Response, target any) {
	t.Helper()
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
}

// parseMap decodes the response body into a map.
func parseMap(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	var m map[string]any
	parseBody(t, resp, &m)
	return m
}

// parseList decodes the response body into a list map (items wrapper).
func parseList(t *testing.T, resp *http.Response) []any {
	t.Helper()
	var m map[string]any
	parseBody(t, resp, &m)
	items, ok := m["items"]
	if !ok {
		t.Fatalf("response missing 'items' field: %+v", m)
	}
	itemsList, ok := items.([]any)
	if !ok {
		t.Fatalf("'items' is not a list: %+v", items)
	}
	return itemsList
}

// createTestTrip creates a trip and stores the ID and day IDs in the context.
func createTestTrip(t *testing.T, ctx *TestContext) {
	t.Helper()

	resp := apiPost(t, ctx, "/trips", map[string]any{
		"title":         "Integration Test Trip",
		"description":   "A trip created by integration tests",
		"start_date":    "2026-07-01",
		"end_date":      "2026-07-05",
		"base_currency": "IDR",
		"budget":        5000000,
		"notes":         "Test trip notes",
	})
	assertStatus(t, resp, 201)

	body := parseMap(t, resp)
	ctx.TripID = body["id"].(string)

	// Fetch trip detail to get day IDs (create response may not include days)
	getResp := apiGet(t, ctx, "/trips/"+ctx.TripID)
	assertStatus(t, getResp, 200)
	getBody := parseMap(t, getResp)

	ctx.DayIDs = nil
	if days, ok := getBody["days"].([]any); ok {
		for _, d := range days {
			day := d.(map[string]any)
			ctx.DayIDs = append(ctx.DayIDs, day["id"].(string))
		}
	}
}

// deleteTestTrip deletes the trip stored in the context.
func deleteTestTrip(t *testing.T, ctx *TestContext) {
	t.Helper()
	if ctx.TripID == "" {
		return
	}
	resp := apiDelete(t, ctx, "/trips/"+ctx.TripID)
	assertStatus(t, resp, 204)
	ctx.TripID = ""
	ctx.DayIDs = nil
}

// seedTestUser inserts a test user directly into the database.
func seedTestUser(t *testing.T, cfg *SetupConfig) {
	t.Helper()
	// We use a direct pgx connection to seed the user.
	// This is done in main_test.go via TestMain.
}

// cleanupTestUser removes the test user from the database.
func cleanupTestUser(t *testing.T, cfg *SetupConfig) {
	t.Helper()
	// This is done in main_test.go via TestMain.
}
