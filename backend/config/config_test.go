package config

import (
	"strings"
	"testing"
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
