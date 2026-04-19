package server

import (
	"context"
	"database/sql"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"sysken-pay-api/app/config"
	"sysken-pay-api/app/infra/repository"
	"sysken-pay-api/app/infra/transaction"
	api_balance "sysken-pay-api/app/ui/api/balance"
	api_charge "sysken-pay-api/app/ui/api/charge"
	"sysken-pay-api/app/ui/api/health"
	api_item "sysken-pay-api/app/ui/api/item"
	api_purchase "sysken-pay-api/app/ui/api/purchase"
	api_user "sysken-pay-api/app/ui/api/user"
	"sysken-pay-api/app/usecase/balance"
	"sysken-pay-api/app/usecase/charge"
	"sysken-pay-api/app/usecase/item"
	"sysken-pay-api/app/usecase/purchase"
	"sysken-pay-api/app/usecase/user"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// TODO エンドポイントとUI層との接続
// usecase層とdomain層の生成
// CROSの設定
// サーバーの立ち上げ

const (
	requestTimeout    = 60 * time.Second
	shutdownTimeout   = 5 * time.Second
	readHeaderTimeout = 10 * time.Second
)

func Run(db *sql.DB) error {
	addr := ":" + strconv.Itoa(config.Port())

	// Transaction
	txManager := transaction.NewTransaction(db)

	// Repository
	userRepo := repository.NewUserProfileRepository(db)
	itemRepo := repository.NewItemRepository(db)
	chargeRepo := repository.NewChargeRepository(db)
	purchaseRepo := repository.NewPurchaseRepository(db)
	balanceRepo := repository.NewBalanceRepository(db)

	// UseCase
	registerUserUseCase := user.NewRegisterUserUseCase(userRepo)
	updateUserUseCase := user.NewUpdateUserUseCase(userRepo)
	registerItemUseCase := item.NewRegisterItemUseCase(itemRepo)
	updateItemUseCase := item.NewUpdateItemUseCase(itemRepo)
	findItemByJanCodeUseCase := item.NewFindItemByJanCodeUseCase(itemRepo)
	getAllItemsUseCase := item.NewGetAllItemsUseCase(itemRepo)
	chargeAmountUseCase := charge.NewChargeAmountUseCase(chargeRepo)
	chargeCancelUseCase := charge.NewChargeCancelUseCase(chargeRepo)
	createPurchaseUseCase := purchase.NewCreatePurchaseUseCase(purchaseRepo, itemRepo, balanceRepo, txManager)
	cancelPurchaseUseCase := purchase.NewCancelPurchaseUseCase(purchaseRepo)
	getBalanceUseCase := balance.NewGetBalanceUseCase(balanceRepo)
	getPurchaseHistoriesUseCase := balance.NewGetPurchaseHistoriesUseCase(balanceRepo)

	// Handler
	userHandler := api_user.NewUserHandler(registerUserUseCase, updateUserUseCase)
	itemHandler := api_item.NewItemHandler(registerItemUseCase, updateItemUseCase, findItemByJanCodeUseCase, getAllItemsUseCase)
	chargeHandler := api_charge.NewChargeHandler(chargeAmountUseCase, chargeCancelUseCase)
	purchaseHandler := api_purchase.NewPurchaseHandler(createPurchaseUseCase, cancelPurchaseUseCase)
	balanceHandler := api_balance.NewBalanceHandler(getBalanceUseCase, getPurchaseHistoriesUseCase)
	// ルーターの設定
	r := chi.NewRouter()

	// ミドルウェアの設定
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(newCORS().Handler)

	// リクエストタイムアウトをコンテキストに設定
	// リクエストがタイムアウトした場合、ctx.Done()を通じて通知し、以降の処理を停止する
	r.Use(middleware.Timeout(requestTimeout))

	// v1 エンドポイント
	r.Route("/v1", func(r chi.Router) {
		// ユーザー関連
		r.Post("/user", userHandler.RegisterUser)
		r.Patch("/user/{user_id}", userHandler.UpdateUser)
		r.Route("/user/{user_id}", func(r chi.Router) {
			r.Post("/charge", chargeHandler.ChargeAmount)
			r.Post("/charge/cancel", chargeHandler.ChargeCancel)
			r.Post("/purchase", purchaseHandler.CreatePurchase)
			r.Post("/purchase/cancel", purchaseHandler.CancelPurchase)
			r.Get("/balance", balanceHandler.GetBalance)
			r.Get("/history", balanceHandler.GetPurchaseHistories)
		})

		// 商品関連
		r.Post("/item", itemHandler.ResisterItem)
		r.Patch("/item", itemHandler.UpdateItem)
		r.Get("/item", itemHandler.GetAllItems)
		r.Get("/item/{jan_code}", itemHandler.GetItemByJanCode)

		// ヘルスチェック
		r.Get("/health", health.Check)
	})

	ctx, _ := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: readHeaderTimeout,
	}

	l, err := net.Listen("tcp", addr)
	slog.Info("Serve on 127.0.0.1", "addr", addr)
	if err != nil {
		slog.Error("failed to listen", "err", err)
	}

	go func() {
		if err = srv.Serve(l); err != nil {
			slog.Error("failed to serve", "err", err)
		}
	}()

	<-ctx.Done()
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err = srv.Shutdown(ctx); err != nil {
		slog.Error("failed to shutdown server", "err", err)
	}

	return nil
}

func newCORS() *cors.Cors {
	return cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedHeaders: []string{"*"},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodHead,
			http.MethodPut,
			http.MethodPatch,
			http.MethodPost,
			http.MethodDelete,
			http.MethodOptions,
		},
	})
}
