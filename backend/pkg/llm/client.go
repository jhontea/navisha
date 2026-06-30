// Package llm provides a thin HTTP client for OpenAI-compatible Chat Completions
// APIs (DeepSeek, OpenRouter, etc.). It is provider-agnostic — the base URL,
// API key, and model are supplied at construction time.
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ── Known provider defaults ──

const (
	ProviderDeepSeek   = "deepseek"
	ProviderOpenRouter = "openrouter"

	defaultDeepSeekBaseURL   = "https://api.deepseek.com"
	defaultOpenRouterBaseURL = "https://openrouter.ai/api/v1"
)

// ── Request / Response types (OpenAI-compatible) ──

// Message represents a chat message.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the payload sent to POST /chat/completions.
type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	// Temperature controls randomness (0.0–2.0). Omitempty so 0 means "not set".
	Temperature *float64 `json:"temperature,omitempty"`
	// ResponseFormat optionally constrains the model output (e.g. JSON schema).
	// When nil it is omitted entirely.
	ResponseFormat *ResponseFormat `json:"response_format,omitempty"`
}

// ResponseFormat constrains the model's output. For structured output set
// Type to "json_schema" and provide JSONSchema.
type ResponseFormat struct {
	Type       string      `json:"type"`
	JSONSchema *JSONSchema `json:"json_schema,omitempty"`
}

// JSONSchema describes the expected JSON shape for structured output.
type JSONSchema struct {
	Name   string `json:"name"`
	Strict bool   `json:"strict,omitempty"`
	Schema any    `json:"schema"`
}

type chatResponse struct {
	Choices []choice `json:"choices"`
}

type choice struct {
	Message Message `json:"message"`
}

// ── Client ──

// Client is a provider-agnostic wrapper around an OpenAI-compatible
// Chat Completions API.
type Client struct {
	provider string
	baseURL  string
	apiKey   string
	model    string
	http     *http.Client
}

// defaultTimeout is generous because some models stream/think slowly.
const defaultTimeout = 120 * time.Second

// NewClient creates a Client for the given provider. If baseURL is empty,
// the default for the provider is used. If model is empty, the caller must
// supply it in each ChatRequest.
func NewClient(provider, apiKey, model, baseURL string) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL(provider)
	}
	return &Client{
		provider: provider,
		baseURL:  baseURL,
		apiKey:   apiKey,
		model:    model,
		http:     &http.Client{Timeout: defaultTimeout},
	}
}

// WithTimeout overrides the HTTP client timeout. A zero or negative value
// leaves the default in place.
func (c *Client) WithTimeout(d time.Duration) *Client {
	if d > 0 {
		c.http.Timeout = d
	}
	return c
}

// Provider returns the provider identifier ("deepseek" or "openrouter").
func (c *Client) Provider() string { return c.provider }

// Model returns the configured model name.
func (c *Client) Model() string { return c.model }

// Ping checks whether the LLM provider is reachable by sending a minimal
// chat completion request with max_tokens=1. Returns true if the provider
// responds with HTTP 200, false otherwise.
func (c *Client) Ping(ctx context.Context) bool {
	if c.apiKey == "" {
		return false
	}
	payload := fmt.Sprintf(`{"model":"%s","messages":[{"role":"user","content":"hi"}],"max_tokens":1}`, c.model)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/chat/completions",
		strings.NewReader(payload))
	if err != nil {
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// SupportsJSONSchema reports whether this provider supports the
// response_format json_schema mode with strict:true (OpenAI extension).
// DeepSeek only supports json_object; OpenRouter passes it through to
// the underlying model.
func (c *Client) SupportsJSONSchema() bool {
	return c.provider == ProviderOpenRouter
}

// ChatCompletion sends a chat completion request and returns the assistant's
// message content. When the provider does not support json_schema strict mode
// (e.g. DeepSeek), the request's ResponseFormat is automatically downgraded
// from json_schema to json_object, and the JSON schema is injected into the
// system prompt so the model still knows the exact output structure.
func (c *Client) ChatCompletion(ctx context.Context, req ChatRequest) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("llm.ChatCompletion: api key required")
	}
	if c.model != "" && req.Model == "" {
		req.Model = c.model
	}

	// DeepSeek does not support response_format json_schema with strict mode.
	// Downgrade to json_object and inject the schema into the system prompt
	// so the model still produces correctly-structured JSON.
	if !c.SupportsJSONSchema() && req.ResponseFormat != nil &&
		req.ResponseFormat.Type == "json_schema" {
		schema := req.ResponseFormat.JSONSchema
		req.ResponseFormat = &ResponseFormat{Type: "json_object"}

		// Inject the JSON schema into the system prompt so the model follows
		// the exact field names and structure even without strict mode.
		if schema != nil && schema.Schema != nil {
			schemaJSON, err := json.MarshalIndent(schema.Schema, "", "  ")
			if err == nil {
				schemaHint := fmt.Sprintf(
					"\n\n## OUTPUT FORMAT (WAJIB DIIKUTI)\n"+
						"Keluarkan HANYA JSON valid persis mengikuti schema berikut.\n"+
						"JANGAN ubah nama field, JANGAN tambah field baru.\n"+
						"Semua field 'required' HARUS ada.\n\n"+
						"```json\n%s\n```",
					string(schemaJSON),
				)
				// Append to the system message (find first system message, or use last).
				injected := false
				for i := range req.Messages {
					if req.Messages[i].Role == "system" {
						req.Messages[i].Content += schemaHint
						injected = true
						break
					}
				}
				if !injected && len(req.Messages) > 0 {
					req.Messages[0].Content += schemaHint
				}
			}
		}
	}

	payload := struct {
		Model          string          `json:"model"`
		Messages       []Message       `json:"messages"`
		ResponseFormat *ResponseFormat `json:"response_format,omitempty"`
	}{
		Model:          req.Model,
		Messages:       req.Messages,
		ResponseFormat: req.ResponseFormat,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("llm.ChatCompletion: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("llm.ChatCompletion: new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.http.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("llm.ChatCompletion: do request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", fmt.Errorf("llm.ChatCompletion: status %d: %s", res.StatusCode, string(respBody))
	}

	var raw chatResponse
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return "", fmt.Errorf("llm.ChatCompletion: decode response: %w", err)
	}

	if len(raw.Choices) == 0 || raw.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("llm.ChatCompletion: empty response content")
	}
	return raw.Choices[0].Message.Content, nil
}

// defaultBaseURL returns the default base URL for a known provider.
func defaultBaseURL(provider string) string {
	switch provider {
	case ProviderDeepSeek:
		return defaultDeepSeekBaseURL
	case ProviderOpenRouter:
		return defaultOpenRouterBaseURL
	default:
		return defaultOpenRouterBaseURL
	}
}
