package config

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	Server     ServerConfig
	DB         DBConfig
	Redis      RedisConfig
	Currency   CurrencyConfig
	JWT        JWTConfig
	Google     GoogleConfig
	App        AppConfig
	LLM        LLMConfig
	OpenRouter OpenRouterConfig // legacy; used as fallback when LLM.Provider is empty
	RateLimit  RateLimitConfig  `mapstructure:"rate_limit"`
}

type ServerConfig struct {
	Port int
}

type DBConfig struct {
	URL             string
	PoolSize        int           `mapstructure:"pool_size"`
	MaxConns        int32         `mapstructure:"max_conns"`
	MinConns        int32         `mapstructure:"min_conns"`
	MaxConnLifetime time.Duration `mapstructure:"max_conn_lifetime"`
	MaxConnIdleTime time.Duration `mapstructure:"max_conn_idle_time"`
}

type RedisConfig struct {
	URL          string
	PoolSize     int `mapstructure:"pool_size"`
	MinIdleConns int `mapstructure:"min_idle_conns"`
}

type RateLimitConfig struct {
	Enabled       bool `mapstructure:"enabled"`
	AuthPerMinute int  `mapstructure:"auth_per_minute"`
	LLMPerMinute  int  `mapstructure:"llm_per_minute"`
	GeneralPerMin int  `mapstructure:"general_per_minute"`
}

type CurrencyConfig struct {
	Supported []string
	CacheTTL  int    `mapstructure:"cache_ttl"`
	APIKey    string `mapstructure:"api_key"`
}

type JWTConfig struct {
	Secret        string
	RefreshSecret string `mapstructure:"refresh_secret"`
	AccessTTL     int    `mapstructure:"access_ttl"`
	RefreshTTL    int    `mapstructure:"refresh_ttl"`
}

type GoogleConfig struct {
	ClientID     string `mapstructure:"client_id"`
	ClientSecret string `mapstructure:"client_secret"`
	RedirectURL  string `mapstructure:"redirect_url"`
}

type AppConfig struct {
	FrontendURL   string   `mapstructure:"frontend_url"`
	CookieDomain  string   `mapstructure:"cookie_domain"`
	AllowedEmails []string `mapstructure:"allowed_emails"`
}

// LLMConfig holds the active LLM provider configuration.
// It supports DeepSeek and OpenRouter, selectable via the Provider field.
// When Provider is empty/unset, the legacy OpenRouter config is used as fallback.
type LLMConfig struct {
	// Provider selects the LLM provider: "deepseek" or "openrouter".
	// When empty, falls back to OpenRouterConfig for backward compatibility.
	Provider string `mapstructure:"provider"`
	// DeepSeek
	DeepSeekAPIKey  string `mapstructure:"deepseek_api_key"`
	DeepSeekModel   string `mapstructure:"deepseek_model"`
	DeepSeekBaseURL string `mapstructure:"deepseek_base_url"`
	// OpenRouter (when LLM provider is explicitly "openrouter")
	OpenRouterAPIKey  string `mapstructure:"openrouter_api_key"`
	OpenRouterModel   string `mapstructure:"openrouter_model"`
	OpenRouterBaseURL string `mapstructure:"openrouter_base_url"`
	// SummaryRateLimitSeconds is the soft window between summary (re)generations
	// for a trip. When 0 (or unset) the rate-limit check is disabled.
	SummaryRateLimitSeconds int `mapstructure:"summary_rate_limit_seconds"`
	// GenerateRateLimitSeconds is the soft window between AI trip generations
	// per user. When 0 (or unset) the rate-limit check is disabled.
	GenerateRateLimitSeconds int `mapstructure:"generate_rate_limit_seconds"`
	// TimeoutSeconds is the HTTP timeout for LLM calls. When 0 (or unset)
	// the client default is used.
	TimeoutSeconds int `mapstructure:"timeout_seconds"`
}

// ActiveAPIKey returns the API key for the currently selected provider.
func (c *Config) ActiveAPIKey() string {
	switch c.LLM.Provider {
	case "deepseek":
		if c.LLM.DeepSeekAPIKey != "" {
			return c.LLM.DeepSeekAPIKey
		}
	case "openrouter":
		if c.LLM.OpenRouterAPIKey != "" {
			return c.LLM.OpenRouterAPIKey
		}
	}
	// Fallback to legacy OpenRouter config
	return c.OpenRouter.APIKey
}

// ActiveModel returns the model name for the currently selected provider.
func (c *Config) ActiveModel() string {
	switch c.LLM.Provider {
	case "deepseek":
		if c.LLM.DeepSeekModel != "" {
			return c.LLM.DeepSeekModel
		}
	case "openrouter":
		if c.LLM.OpenRouterModel != "" {
			return c.LLM.OpenRouterModel
		}
	}
	// Fallback to legacy OpenRouter config
	return c.OpenRouter.Model
}

// ActiveBaseURL returns the base URL for the currently selected provider.
// Returns empty string when unset (the llm.Client uses provider defaults).
func (c *Config) ActiveBaseURL() string {
	switch c.LLM.Provider {
	case "deepseek":
		return c.LLM.DeepSeekBaseURL
	case "openrouter":
		return c.LLM.OpenRouterBaseURL
	default:
		return c.OpenRouter.BaseURL
	}
}

// EffectiveProvider returns the active provider identifier, defaulting to
// "openrouter" when LLM.Provider is empty (backward compat).
func (c *Config) EffectiveProvider() string {
	if c.LLM.Provider != "" {
		return c.LLM.Provider
	}
	return "openrouter"
}

// OpenRouterConfig is kept for backward compatibility with existing deployments
// that set OPENROUTER_API_KEY / OPENROUTER_MODEL without LLM_PROVIDER.
// New deployments should use LLMConfig with LLM_PROVIDER.
type OpenRouterConfig struct {
	APIKey  string `mapstructure:"api_key"`
	Model   string `mapstructure:"model"`
	BaseURL string `mapstructure:"base_url"`
	// SummaryRateLimitSeconds is the soft window between summary (re)generations
	// for a trip. When 0 (or unset) the rate-limit check is disabled.
	SummaryRateLimitSeconds int `mapstructure:"summary_rate_limit_seconds"`
	// TimeoutSeconds is the HTTP timeout for OpenRouter calls. When 0 (or unset)
	// the client default is used.
	TimeoutSeconds int `mapstructure:"timeout_seconds"`
}

func Load() (*Config, error) {
	// Load .env if present (dev only — ignored in prod).
	// Log a warning on failure so misconfigured dev environments are visible.
	if err := godotenv.Load(".env"); err != nil {
		log.Printf("config.Load: .env not loaded (this is fine in production): %v", err)
	}

	v := viper.New()

	// Base config file
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("config.Load: read config.yaml: %w", err)
	}

	// Env vars override yaml — map env names to viper keys
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Explicit env bindings for secrets not in config.yaml
	for key, envVar := range map[string]string{
		"db.url":               "DATABASE_URL",
		"redis.url":            "REDIS_URL",
		"jwt.secret":           "JWT_SECRET",
		"jwt.refresh_secret":   "JWT_REFRESH_SECRET",
		"google.client_id":     "GOOGLE_CLIENT_ID",
		"google.client_secret": "GOOGLE_CLIENT_SECRET",
		"google.redirect_url":  "GOOGLE_REDIRECT_URL",
		"app.frontend_url":     "FRONTEND_URL",
		"app.cookie_domain":    "COOKIE_DOMAIN",
		"currency.api_key":     "CURRENCYFREAKS_API_KEY",
		"openrouter.api_key":   "OPENROUTER_API_KEY",
		"openrouter.model":     "OPENROUTER_MODEL",
		"llm.provider":         "LLM_PROVIDER",
		"llm.deepseek_api_key": "DEEPSEEK_API_KEY",
		"llm.deepseek_model":   "DEEPSEEK_MODEL",
	} {

		if err := v.BindEnv(key, envVar); err != nil {
			return nil, fmt.Errorf("config.Load: bind env %s: %w", envVar, err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("config.Load: unmarshal: %w", err)
	}

	// ALLOWED_EMAILS is a comma-separated list: "a@b.com,c@d.com"
	// Viper doesn't reliably split CSV env vars into slices, so parse manually.
	if raw := os.Getenv("ALLOWED_EMAILS"); raw != "" {
		var emails []string
		for _, e := range strings.Split(raw, ",") {
			if trimmed := strings.TrimSpace(e); trimmed != "" {
				emails = append(emails, trimmed)
			}
		}
		cfg.App.AllowedEmails = emails
	}

	return &cfg, nil
}
