package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/piggybank/backend/internal/actions"
	"github.com/piggybank/backend/internal/auth"
	"github.com/piggybank/backend/internal/common/email"
	"github.com/piggybank/backend/internal/common/server"
	"github.com/piggybank/backend/internal/config"
	"github.com/piggybank/backend/internal/couples"
	"github.com/piggybank/backend/internal/database"
	"github.com/piggybank/backend/internal/piggybanks"
	"github.com/piggybank/backend/internal/users"
	"github.com/piggybank/backend/internal/vouchers"
)

type authResponse struct {
	Token string       `json:"token"`
	User  userResponse `json:"user"`
}

type userResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

func mapUser(user users.User) userResponse {
	return userResponse{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
	}
}

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
	log.Default().Println("Database connection established. Starting migrations")
	if err := database.RunMigrations(dbPool, cfg.Database.URL); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	router := gin.Default()
	router.RedirectTrailingSlash = false
	router.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
        // Acceptar localhost amb qualsevol port		
        if strings.HasPrefix(origin, "http://localhost:") {
            return true
        }
        // Acceptar exp:// amb qualsevol cosa
        if strings.HasPrefix(origin, "exp://") {
            return true
        }
        return false
    },
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300 * time.Second,
	}))

	router.GET("/health", gin.WrapF(server.HealthHandler))

	userRepo := users.NewPGRepository(dbPool)
	jwtManager := auth.NewManager(cfg.Auth.AccessTokenSecret, cfg.Auth.AccessTokenTTL)
	authService := auth.NewService(userRepo, jwtManager)
	authHandler := auth.NewHandler(authService)
	authMiddleware := auth.NewMiddleware(jwtManager, userRepo)

	// Initialize email service if configured
	var emailService *email.Service
	if cfg.Email.SMTPHost != "" && cfg.Email.Username != "" {
		service := email.NewService(
			cfg.Email.SMTPHost,
			cfg.Email.SMTPPort,
			cfg.Email.Username,
			cfg.Email.Password,
			cfg.Email.From,
			"https://piggybank.zenith.ovh", // Frontend URL for invitation links
		)
		emailService = &service
	}

	coupleStore := couples.NewStore(dbPool)
	// Use frontend URL for invitation links
	coupleService := couples.NewService(coupleStore, userRepo, emailService, "https://api.piggybank.zenith.ovh")
	coupleHandler := couples.NewHandler(coupleService)
	piggybankStore := piggybanks.NewStore(dbPool)
	piggybankService := piggybanks.NewService(piggybankStore, coupleStore)
	piggybankHandler := piggybanks.NewHandler(piggybankService)
	voucherStore := vouchers.NewStore(dbPool)
	voucherService := vouchers.NewService(voucherStore, piggybankStore)
	voucherHandler := vouchers.NewHandler(voucherService)
	actionStore := actions.NewStore(dbPool)
	actionService := actions.NewService(actionStore, piggybankStore, voucherStore)
	actionHandler := actions.NewHandler(actionService)

	authGroup := router.Group("/auth")
	authGroup.POST("/register", gin.WrapF(authHandler.Register))
	authGroup.POST("/login", gin.WrapF(authHandler.Login))

	authMe := authGroup.Group("")
	authMe.Use(authMiddleware.GinAuthenticate)
	authMe.GET("/me", gin.WrapF(authHandler.Me))

	// Invitation-based registration endpoint
	router.POST("/auth/register-with-invitation", func(c *gin.Context) {
		var req struct {
			Email          string `json:"email"`
			Password       string `json:"password"`
			Name           string `json:"name"`
			InvitationToken string `json:"invitationToken"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}

		// Check if invitation token is valid
		invitationReq, err := coupleService.GetRequestByInvitationToken(c.Request.Context(), req.InvitationToken)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invitation token"})
			return
		}

		// Verify email matches invitation
		if invitationReq.TargetEmail == nil || *invitationReq.TargetEmail != req.Email {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email does not match invitation"})
			return
		}

		// Register the user
		user, token, err := authService.Register(c.Request.Context(), req.Email, req.Password, req.Name)
		if err != nil {
			if errors.Is(err, auth.ErrEmailAlreadyRegistered) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "email already registered"})
				return
			}
			log.Printf("internal error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		// Update the couple request to set target_user_id
		err = coupleService.UpdateRequestTargetUser(c.Request.Context(), invitationReq.ID, user.ID)
		if err != nil {
			log.Printf("failed to update couple invitation: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process invitation"})
			return
		}

		c.JSON(http.StatusCreated, authResponse{
			Token: token,
			User:  mapUser(user),
		})
	})

	couples := router.Group("/couples")
	couples.Use(authMiddleware.GinAuthenticate)
	couples.POST("/request", gin.WrapF(coupleHandler.Request))
	couples.POST("/accept", gin.WrapF(coupleHandler.Accept))
	couples.POST("/resend", gin.WrapF(coupleHandler.Resend))
	couples.GET("/me", gin.WrapF(coupleHandler.Status))

	piggybanks := router.Group("/piggybanks")
	piggybanks.Use(authMiddleware.GinAuthenticate)
	piggybanks.POST("", piggybankHandler.Create)
	piggybanks.GET("", piggybankHandler.List)
	piggybanks.GET("/:id", piggybankHandler.GetByID)
	piggybanks.POST("/:id/close", piggybankHandler.Close)

	voucherTemplates := router.Group("/voucher-templates")
	voucherTemplates.Use(authMiddleware.GinAuthenticate)
	voucherTemplates.POST("", voucherHandler.Create)

	piggybankVoucherTemplates := router.Group("/piggybanks/:id/voucher-templates")
	piggybankVoucherTemplates.Use(authMiddleware.GinAuthenticate)
	piggybankVoucherTemplates.GET("", voucherHandler.ListByPiggyBank)

	actionEntries := router.Group("/action-entries")
	actionEntries.Use(authMiddleware.GinAuthenticate)
	actionEntries.POST("", actionHandler.Create)

	piggybankActionEntries := router.Group("/piggybanks/:id/action-entries")
	piggybankActionEntries.Use(authMiddleware.GinAuthenticate)
	piggybankActionEntries.GET("", actionHandler.ListByPiggyBank)

	piggybankStats := router.Group("/piggybanks/:id/stats")
	piggybankStats.Use(authMiddleware.GinAuthenticate)
	piggybankStats.GET("", actionHandler.GetStats)

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
