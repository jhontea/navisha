// Package llm provides a thin HTTP client for OpenAI-compatible Chat Completions
// APIs (DeepSeek, OpenRouter, etc.). It is provider-agnostic — the base URL,
// API key, and model are supplied at construction time.
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"net"
	"net/http"
	"strconv"
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
	// MaxTokens caps the length of the reply; nil leaves the provider default.
	MaxTokens *int `json:"max_tokens,omitempty"`
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
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
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
	// slots bounds concurrent provider calls across all callers. A slot is held
	// per HTTP attempt, never while sleeping between retries.
	slots chan struct{}
	// backoffBase is the first retry delay; it doubles per attempt (tests shrink it).
	backoffBase time.Duration
}

const (
	// defaultTimeout is generous because some models stream/think slowly.
	defaultTimeout = 120 * time.Second
	// defaultMaxConcurrent is the default cap on simultaneous provider calls.
	defaultMaxConcurrent = 4
	// maxRetries is the number of extra attempts after the first one.
	maxRetries = 2
	// maxRetryDelay caps both the backoff and a provider's Retry-After.
	maxRetryDelay = 10 * time.Second
	// maxResponseBytes caps how much of a provider response is read.
	maxResponseBytes = 4 << 20
)

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
		slots:    make(chan struct{}, defaultMaxConcurrent),

		backoffBase: time.Second,
	}
}

// WithMaxConcurrent sets how many provider calls may run at once; extra
// callers wait for a slot. A zero or negative value leaves the default.
// Call it before the client is shared between goroutines.
func (c *Client) WithMaxConcurrent(n int) *Client {
	if n > 0 {
		c.slots = make(chan struct{}, n)
	}
	return c
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

	// The request is sent as-is (temperature and max_tokens included; they
	// used to be dropped here, so every call ran at the provider default).
	content, finish, err := c.send(ctx, req)
	if err != nil {
		return "", err
	}
	// A reasoning model can spend most or all of the max_tokens budget thinking
	// and return no answer or a truncated one (empty or cut-off JSON). Ask once
	// more without the cap (the provider default).
	if finish == "length" && req.MaxTokens != nil {
		slog.Warn("llm.ChatCompletion: reply truncated at max_tokens, retrying without it",
			"provider", c.provider, "model", req.Model, "max_tokens", *req.MaxTokens, "chars", len(content))
		req.MaxTokens = nil
		content, finish, err = c.send(ctx, req)
		if err != nil {
			return "", err
		}
	}
	if content == "" {
		return "", fmt.Errorf("llm.ChatCompletion: empty response content (finish_reason %q)", finish)
	}
	return content, nil
}

// send makes a chat completion call and returns the first choice's content and
// finish reason. Transient failures (429/502/503/504, temporary network errors)
// are retried up to maxRetries times with exponential backoff + jitter.
func (c *Client) send(ctx context.Context, req ChatRequest) (string, string, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return "", "", fmt.Errorf("llm.ChatCompletion: marshal request: %w", err)
	}

	for attempt := 0; ; attempt++ {
		content, finish, retryAfter, retryable, err := c.attempt(ctx, body)
		if err == nil || !retryable || attempt >= maxRetries {
			return content, finish, err
		}
		delay := min(c.backoffBase<<attempt, maxRetryDelay)
		delay += rand.N(delay/2 + 1) //nolint:gosec // jitter needs no crypto randomness
		if retryAfter > 0 {
			delay = min(retryAfter, maxRetryDelay)
		}
		slog.Warn("llm.ChatCompletion: transient failure, retrying",
			"provider", c.provider, "attempt", attempt+1, "delay", delay)
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return "", "", fmt.Errorf("llm.ChatCompletion: retry wait: %w", ctx.Err())
		case <-timer.C:
		}
	}
}

// attempt performs one HTTP call while holding a concurrency slot. It reports
// whether a failure is worth retrying and any server-requested Retry-After.
func (c *Client) attempt(ctx context.Context, body []byte) (content, finish string, retryAfter time.Duration, retryable bool, err error) {
	select {
	case c.slots <- struct{}{}:
		defer func() { <-c.slots }()
	case <-ctx.Done():
		return "", "", 0, false, fmt.Errorf("llm.ChatCompletion: wait for slot: %w", ctx.Err())
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", "", 0, false, fmt.Errorf("llm.ChatCompletion: new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.http.Do(httpReq)
	if err != nil {
		// A client timeout is not retried: it already burned the full budget.
		var ne net.Error
		timedOut := errors.As(err, &ne) && ne.Timeout()
		transient := ctx.Err() == nil && !timedOut
		return "", "", 0, transient, fmt.Errorf("llm.ChatCompletion: do request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		// Provider response bodies can contain request details or echoed user
		// input. Keep them out of wrapped errors because callers log those errors.
		err = fmt.Errorf("llm.ChatCompletion: provider %q returned status %d", c.provider, res.StatusCode)
		switch res.StatusCode {
		case http.StatusTooManyRequests, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
			if secs, convErr := strconv.Atoi(res.Header.Get("Retry-After")); convErr == nil && secs > 0 {
				retryAfter = time.Duration(secs) * time.Second
			}
			return "", "", retryAfter, true, err
		}
		return "", "", 0, false, err
	}

	data, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return "", "", 0, false, fmt.Errorf("llm.ChatCompletion: read response: %w", err)
	}
	if len(data) > maxResponseBytes {
		return "", "", 0, false, fmt.Errorf("llm.ChatCompletion: response exceeds %d bytes", maxResponseBytes)
	}
	var raw chatResponse
	if err := json.Unmarshal(data, &raw); err != nil {
		return "", "", 0, false, fmt.Errorf("llm.ChatCompletion: decode response: %w", err)
	}
	if len(raw.Choices) == 0 {
		return "", "", 0, false, nil
	}
	return raw.Choices[0].Message.Content, raw.Choices[0].FinishReason, 0, false, nil
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
