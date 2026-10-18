package config

import (
	"strings"
	"testing"

	"github.com/spf13/viper"
)

func validProductionConfig() Config {
	return Config{
		JWT: JWTConfig{
			Secret:        strings.Repeat("a", 32),
			RefreshSecret: strings.Repeat("b", 32),
			AccessTTL:     900,
			RefreshTTL:    604800,
		},
		App: AppConfig{
			Environment:     "production",
			FrontendURL:     "https://navisha.cloud",
			CookieDomain:    ".navisha.cloud",
			ShareLinkSecret: strings.Repeat("c", 32),
		},
	}
}

func TestValidateProductionAcceptsStrongDistinctSecrets(t *testing.T) {
	cfg := validProductionConfig()
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate: %v", err)
	}
}

func TestValidateProductionRejectsUnsafeAuthConfiguration(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*Config)
	}{
		{"placeholder secret", func(c *Config) { c.JWT.Secret = "change-me" }},
		{"same jwt secrets", func(c *Config) { c.JWT.RefreshSecret = c.JWT.Secret }},
		{"missing share secret", func(c *Config) { c.App.ShareLinkSecret = "" }},
		{"shared signing secret", func(c *Config) { c.App.ShareLinkSecret = c.JWT.Secret }},
		{"http frontend", func(c *Config) { c.App.FrontendURL = "http://navisha.cloud" }},
		{"missing cookie domain", func(c *Config) { c.App.CookieDomain = "" }},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg := validProductionConfig()
			tc.mutate(&cfg)
			if err := cfg.Validate(); err == nil {
				t.Fatal("Validate returned nil for unsafe production config")
			}
		})
	}
}

func TestValidateE2EAuthOnlyInTestEnvironment(t *testing.T) {
	for _, env := range []string{"production", "development", ""} {
		cfg := validProductionConfig()
		cfg.App.Environment = env
		cfg.App.E2EAuth = true
		if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "E2E_AUTH") {
			t.Errorf("APP_ENV=%q with E2E_AUTH=true: want E2E_AUTH error, got %v", env, err)
		}
	}

	cfg := validProductionConfig()
	cfg.App.Environment = "test"
	cfg.App.E2EAuth = true
	if err := cfg.Validate(); err != nil {
		t.Errorf("APP_ENV=test with E2E_AUTH=true: %v", err)
	}
}

// The committed config.yaml must decode into Config. A misspelled key
// silently decodes to 0: rate_limit.general_per_min once turned the general
// rate limit off in production. Reads the file directly (not Load) so no
// .env secrets are pulled into the test.
func TestConfigYAMLRateLimitsDecode(t *testing.T) {
	v := viper.New()
	v.SetConfigFile("../config.yaml")
	if err := v.ReadInConfig(); err != nil {
		t.Fatalf("read config.yaml: %v", err)
	}
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		t.Fatalf("unmarshal config.yaml: %v", err)
	}

	rl := cfg.RateLimit
	if !rl.Enabled {
		t.Error("rate_limit.enabled = false, want true")
	}
	for key, got := range map[string]int{
		"auth_per_minute":    rl.AuthPerMinute,
		"llm_per_minute":     rl.LLMPerMinute,
		"general_per_minute": rl.GeneralPerMin,
	} {
		if got <= 0 {
			t.Errorf("rate_limit.%s = %d, want > 0", key, got)
		}
	}
}
