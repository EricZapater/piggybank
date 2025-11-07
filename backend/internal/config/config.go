package config

import (
	"errors"
	"os"
	"strconv"
	"time"
)

// Config aggregates all runtime configuration values for the application.
type Config struct {
	App struct {
		Port string
	}
	Database struct {
		URL string
	}
	Auth struct {
		AccessTokenSecret string
		AccessTokenTTL    time.Duration
	}
	Migration struct {
		Path string
	}
}

// Load reads configuration from the environment and applies sane defaults.
func Load() (Config, error) {
	var cfg Config

	cfg.App.Port = getenvDefault("APP_PORT", "8080")

	cfg.Database.URL = os.Getenv("DATABASE_URL")
	if cfg.Database.URL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}

	cfg.Auth.AccessTokenSecret = os.Getenv("JWT_ACCESS_SECRET")
	if cfg.Auth.AccessTokenSecret == "" {
		return Config{}, errors.New("JWT_ACCESS_SECRET is required")
	}

    ttlString := getenvDefault("JWT_ACCESS_TTL", "604800")
	ttlSeconds, err := strconv.Atoi(ttlString)
	if err != nil {
		return Config{}, errors.New("JWT_ACCESS_TTL must be an integer representing seconds")
	}
	cfg.Auth.AccessTokenTTL = time.Duration(ttlSeconds) * time.Second

	cfg.Migration.Path = getenvDefault("MIGRATIONS_PATH", "./migrations")

	return cfg, nil
}

func getenvDefault(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
