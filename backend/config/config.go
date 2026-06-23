package config

import (
	"fmt"
	"strings"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	DB       DBConfig
	Redis    RedisConfig
	Currency CurrencyConfig
	JWT      JWTConfig
	Google   GoogleConfig
	App      AppConfig
}

type ServerConfig struct {
	Port int
}

type DBConfig struct {
	URL      string
	PoolSize int `mapstructure:"pool_size"`
}

type RedisConfig struct {
	URL      string
	PoolSize int `mapstructure:"pool_size"`
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
	FrontendURL  string `mapstructure:"frontend_url"`
	CookieDomain string `mapstructure:"cookie_domain"`
}

func Load() (*Config, error) {
	// Load .env if present (dev only — ignored in prod)
	_ = godotenv.Load()

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
	} {
		if err := v.BindEnv(key, envVar); err != nil {
			return nil, fmt.Errorf("config.Load: bind env %s: %w", envVar, err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("config.Load: unmarshal: %w", err)
	}

	return &cfg, nil
}
