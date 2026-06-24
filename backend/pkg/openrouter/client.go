// Package openrouter provides a thin HTTP client for the OpenRouter API.
package openrouter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const defaultBaseURL = "https://openrouter.ai/api/v1"

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type chatResponse struct {
	Choices []choice `json:"choices"`
}

type choice struct {
	Message Message `json:"message"`
}

// Client is a small wrapper around the OpenRouter Chat Completions API.
type Client struct {
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
}

// defaultTimeout is generous because some models stream/think slowly.
const defaultTimeout = 120 * time.Second

func NewClient(apiKey, model string) *Client {
	return &Client{
		baseURL: defaultBaseURL,
		apiKey:  apiKey,
		model:   model,
		http:    &http.Client{Timeout: defaultTimeout},
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

func (c *Client) ChatCompletion(ctx context.Context, req ChatRequest) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("openrouter.ChatCompletion: api key required")
	}
	if c.model != "" && req.Model == "" {
		req.Model = c.model
	}

	payload := struct {
		Model    string    `json:"model"`
		Messages []Message `json:"messages"`
	}{
		Model:    req.Model,
		Messages: req.Messages,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("openrouter.ChatCompletion: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("openrouter.ChatCompletion: new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.http.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("openrouter.ChatCompletion: do request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", fmt.Errorf("openrouter.ChatCompletion: status %d: %s", res.StatusCode, string(respBody))
	}

	var raw chatResponse
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return "", fmt.Errorf("openrouter.ChatCompletion: decode response: %w", err)
	}

	if len(raw.Choices) == 0 || raw.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("openrouter.ChatCompletion: empty response content")
	}
	return raw.Choices[0].Message.Content, nil
}
