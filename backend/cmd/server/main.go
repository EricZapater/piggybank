package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"github.com/piggybank/backend/internal/auth"
	"github.com/piggybank/backend/internal/common/server"
	"github.com/piggybank/backend/internal/config"
	"github.com/piggybank/backend/internal/couples"
	"github.com/piggybank/backend/internal/database"
	"github.com/piggybank/backend/internal/users"
)

func main() {
	if err := godotenv.Load(); err != nil {
		if !os.IsNotExist(err) {
			log.Fatalf("failed to load .env file: %v", err)
		}
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbPool, err := database.Connect(ctx, cfg.Database.URL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer dbPool.Close()

	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(60 * time.Second))

	router.Get("/health", server.HealthHandler)

	userRepo := users.NewPGRepository(dbPool)
	jwtManager := auth.NewManager(cfg.Auth.AccessTokenSecret, cfg.Auth.AccessTokenTTL)
	authService := auth.NewService(userRepo, jwtManager)
	authHandler := auth.NewHandler(authService)
	authMiddleware := auth.NewMiddleware(jwtManager, userRepo)
	coupleStore := couples.NewStore(dbPool)
	coupleService := couples.NewService(coupleStore, userRepo)
	coupleHandler := couples.NewHandler(coupleService)

	router.Route("/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)

		r.Group(func(pr chi.Router) {
			pr.Use(authMiddleware.Authenticate)
			pr.Get("/me", authHandler.Me)
		})
	})

	router.Route("/couples", func(r chi.Router) {
		r.Use(authMiddleware.Authenticate)
		r.Post("/request", coupleHandler.Request)
		r.Post("/accept", coupleHandler.Accept)
		r.Get("/me", coupleHandler.Status)
	})

	srv := &http.Server{
		Addr:    ":" + cfg.App.Port,
		Handler: router,
	}

	go func() {
		log.Printf("server listening on port %s", cfg.App.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	<-sigCh
	log.Println("shutdown signal received")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
		if err := srv.Close(); err != nil {
			log.Printf("force close failed: %v", err)
		}
	}

	log.Println("server stopped")
}
