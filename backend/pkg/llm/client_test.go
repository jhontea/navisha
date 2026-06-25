package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestChatCompletion_HappyPath(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("expected Bearer test-key, got %s", r.Header.Get("Authorization"))
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json, got %s", r.Header.Get("Content-Type"))
		}

		var req struct {
			Model    string    `json:"model"`
			Messages []Message `json:"messages"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if req.Model != "test-model" {
			t.Errorf("expected model test-model, got %s", req.Model)
		}
		if len(req.Messages) != 2 {
			t.Errorf("expected 2 messages, got %d", len(req.Messages))
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{
					"message": map[string]string{
						"role":    "assistant",
						"content": "Hello from AI!",
					},
				},
			},
		})
	}))
	defer srv.Close()

	c := NewClient(ProviderOpenRouter, "test-key", "test-model", srv.URL)

	content, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{
			{Role: "system", Content: "You are a travel planner."},
			{Role: "user", Content: "Summarize my trip."},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if content != "Hello from AI!" {
		t.Errorf("expected 'Hello from AI!', got %q", content)
	}
}

func TestChatCompletion_Non200Status(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	c := NewClient(ProviderOpenRouter, "test-key", "test-model", srv.URL)

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err == nil {
		t.Fatal("expected error for non-200 status")
	}
}

func TestChatCompletion_EmptyAPIKey(t *testing.T) {
	c := NewClient(ProviderOpenRouter, "", "test-model", "")

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err == nil {
		t.Fatal("expected error for empty API key")
	}
	if !strings.Contains(err.Error(), "api key required") {
		t.Errorf("expected 'api key required' in error, got: %v", err)
	}
}

func TestChatCompletion_ModelFromClient(t *testing.T) {
	// When ChatRequest.Model is empty, the client's model should be used.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Model string `json:"model"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Model != "client-model" {
			t.Errorf("expected model 'client-model', got %q", req.Model)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]string{"content": "ok"}},
			},
		})
	}))
	defer srv.Close()

	c := NewClient(ProviderOpenRouter, "test-key", "client-model", srv.URL)

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestChatCompletion_RequestModelOverridesClientModel(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Model string `json:"model"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Model != "request-model" {
			t.Errorf("expected model 'request-model', got %q", req.Model)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]string{"content": "ok"}},
			},
		})
	}))
	defer srv.Close()

	c := NewClient(ProviderOpenRouter, "test-key", "client-model", srv.URL)

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Model:    "request-model",
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestProvider(t *testing.T) {
	c := NewClient(ProviderDeepSeek, "key", "model", "")
	if c.Provider() != ProviderDeepSeek {
		t.Errorf("expected provider deepseek, got %s", c.Provider())
	}

	c2 := NewClient(ProviderOpenRouter, "key", "model", "")
	if c2.Provider() != ProviderOpenRouter {
		t.Errorf("expected provider openrouter, got %s", c2.Provider())
	}
}

func TestSupportsJSONSchema(t *testing.T) {
	ds := NewClient(ProviderDeepSeek, "key", "model", "")
	if ds.SupportsJSONSchema() {
		t.Error("DeepSeek should NOT support json_schema")
	}

	or := NewClient(ProviderOpenRouter, "key", "model", "")
	if !or.SupportsJSONSchema() {
		t.Error("OpenRouter should support json_schema")
	}
}

func TestDefaultBaseURL(t *testing.T) {
	tests := []struct {
		provider string
		expected string
	}{
		{ProviderDeepSeek, defaultDeepSeekBaseURL},
		{ProviderOpenRouter, defaultOpenRouterBaseURL},
		{"unknown", defaultOpenRouterBaseURL},
	}

	for _, tt := range tests {
		got := defaultBaseURL(tt.provider)
		if got != tt.expected {
			t.Errorf("defaultBaseURL(%q) = %q, want %q", tt.provider, got, tt.expected)
		}
	}
}

func TestChatCompletion_JsonSchemaDowngrade(t *testing.T) {
	// When provider is DeepSeek, json_schema should be downgraded to json_object,
	// and the schema should be injected into the system prompt.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ResponseFormat *ResponseFormat `json:"response_format"`
			Messages       []Message       `json:"messages"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode body: %v", err)
		}

		// DeepSeek should receive json_object, not json_schema.
		if req.ResponseFormat == nil {
			t.Error("expected response_format to be present")
		} else if req.ResponseFormat.Type != "json_object" {
			t.Errorf("expected response_format type 'json_object', got %q", req.ResponseFormat.Type)
		}
		if req.ResponseFormat.JSONSchema != nil {
			t.Error("expected json_schema to be nil after downgrade")
		}

		// Schema should be injected into the system message.
		var systemMsg string
		for _, m := range req.Messages {
			if m.Role == "system" {
				systemMsg = m.Content
				break
			}
		}
		if !strings.Contains(systemMsg, "OUTPUT FORMAT") {
			t.Error("expected schema hint injected into system message, got none")
		}
		if !strings.Contains(systemMsg, `"type": "object"`) {
			t.Error("expected schema JSON in system message, got none")
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]string{"content": "{}"}},
			},
		})
	}))
	defer srv.Close()

	c := NewClient(ProviderDeepSeek, "test-key", "deepseek-v4-flash", srv.URL)

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{
			{Role: "system", Content: "You are a travel planner."},
			{Role: "user", Content: "Generate JSON"},
		},
		ResponseFormat: &ResponseFormat{
			Type: "json_schema",
			JSONSchema: &JSONSchema{
				Name:   "trip_draft",
				Strict: true,
				Schema: map[string]any{"type": "object", "properties": map[string]any{"ok": map[string]any{"type": "boolean"}}},
			},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestChatCompletion_OpenRouterKeepsJsonSchema(t *testing.T) {
	// OpenRouter should keep json_schema unchanged.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ResponseFormat *ResponseFormat `json:"response_format"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode body: %v", err)
		}

		if req.ResponseFormat == nil {
			t.Error("expected response_format to be present")
		} else if req.ResponseFormat.Type != "json_schema" {
			t.Errorf("expected response_format type 'json_schema', got %q", req.ResponseFormat.Type)
		}
		if req.ResponseFormat.JSONSchema == nil {
			t.Error("expected json_schema to be present for OpenRouter")
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]string{"content": "{}"}},
			},
		})
	}))
	defer srv.Close()

	c := NewClient(ProviderOpenRouter, "test-key", "test-model", srv.URL)

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "Generate JSON"}},
		ResponseFormat: &ResponseFormat{
			Type: "json_schema",
			JSONSchema: &JSONSchema{
				Name:   "trip_draft",
				Strict: true,
				Schema: map[string]any{},
			},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
