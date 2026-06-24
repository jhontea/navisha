package openrouter

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

	c := &Client{
		baseURL: srv.URL,
		apiKey:  "test-key",
		model:   "test-model",
		http:    srv.Client(),
	}

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

	c := &Client{
		baseURL: srv.URL,
		apiKey:  "test-key",
		model:   "test-model",
		http:    srv.Client(),
	}

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err == nil {
		t.Fatal("expected error for non-200 status")
	}
}

func TestChatCompletion_EmptyAPIKey(t *testing.T) {
	c := NewClient("", "test-model")

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err == nil {
		t.Fatal("expected error for empty API key")
	}
}

func TestChatCompletion_EmptyResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{},
		})
	}))
	defer srv.Close()

	c := &Client{
		baseURL: srv.URL,
		apiKey:  "test-key",
		model:   "test-model",
		http:    srv.Client(),
	}

	_, err := c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if err == nil {
		t.Fatal("expected error for empty response")
	}
}

func TestChatCompletion_ModelOverride(t *testing.T) {
	var receivedModel string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Model string `json:"model"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		receivedModel = req.Model

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]string{"role": "assistant", "content": "ok"}},
			},
		})
	}))
	defer srv.Close()

	c := &Client{
		baseURL: srv.URL,
		apiKey:  "test-key",
		model:   "default-model",
		http:    srv.Client(),
	}

	// When request has no model, use client default
	c.ChatCompletion(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if receivedModel != "default-model" {
		t.Errorf("expected default-model, got %s", receivedModel)
	}

	// When request has a model, use it
	c.ChatCompletion(context.Background(), ChatRequest{
		Model:    "override-model",
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	if receivedModel != "override-model" {
		t.Errorf("expected override-model, got %s", receivedModel)
	}
}
