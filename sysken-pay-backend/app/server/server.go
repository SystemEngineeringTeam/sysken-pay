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
	api_item "sysken-pay-api/app/ui/api/item"
	api_member "sysken-pay-api/app/ui/api/member"
	api_paymentcard "sysken-pay-api/app/ui/api/paymentcard"
	api_purchase "sysken-pay-api/app/ui/api/purchase"
	api_user "sysken-pay-api/app/ui/api/user"
	"sysken-pay-api/app/usecase/balance"
	"sysken-pay-api/app/usecase/charge"
	"sysken-pay-api/app/usecase/item"
	"sysken-pay-api/app/usecase/member"
	"sysken-pay-api/app/usecase/paymentcard"
	"sysken-pay-api/app/usecase/purchase"
	"sysken-pay-api/app/usecase/user"
	"time"
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
	paymentCardRepo := repository.NewPaymentCardRepository(db)
	paymentCardClaimRepo := repository.NewPaymentCardClaimRepository(db)
	memberRepo := repository.NewMemberRepository(db)

	// UseCase
	getUserUseCase := user.NewGetUserUseCase(userRepo)
	registerUserUseCase := user.NewRegisterUserUseCase(userRepo)
	updateUserUseCase := user.NewUpdateUserUseCase(userRepo, txManager)
	registerItemUseCase := item.NewRegisterItemUseCase(itemRepo)
	updateItemUseCase := item.NewUpdateItemUseCase(itemRepo)
	findItemByJanCodeUseCase := item.NewFindItemByJanCodeUseCase(itemRepo)
	getAllItemsUseCase := item.NewGetAllItemsUseCase(itemRepo)
	chargeAmountUseCase := charge.NewChargeAmountUseCase(chargeRepo, memberRepo)
	chargeCancelUseCase := charge.NewChargeCancelUseCase(chargeRepo)
	createPurchaseUseCase := purchase.NewCreatePurchaseUseCase(purchaseRepo, itemRepo, balanceRepo, memberRepo, txManager)
	cancelPurchaseUseCase := purchase.NewCancelPurchaseUseCase(purchaseRepo)
	getBalanceUseCase := balance.NewGetBalanceUseCase(balanceRepo)
	getPurchaseHistoriesUseCase := balance.NewGetPurchaseHistoriesUseCase(balanceRepo)
	issuePaymentCardUseCase := paymentcard.NewIssueUseCase(userRepo, paymentCardRepo, txManager)
	resolvePaymentCardUseCase := paymentcard.NewResolveUseCase(userRepo, paymentCardRepo)
	paymentCardClaimUseCase := paymentcard.NewClaimUseCase(userRepo, paymentCardRepo, paymentCardClaimRepo, txManager)
	memberUseCase := member.NewUseCase(memberRepo, balanceRepo, paymentCardRepo, txManager)

	// Handler
	userHandler := api_user.NewUserHandler(getUserUseCase, registerUserUseCase, updateUserUseCase)
	itemHandler := api_item.NewItemHandler(registerItemUseCase, updateItemUseCase, findItemByJanCodeUseCase, getAllItemsUseCase)
	chargeHandler := api_charge.NewChargeHandler(chargeAmountUseCase, chargeCancelUseCase)
	purchaseHandler := api_purchase.NewPurchaseHandler(createPurchaseUseCase, cancelPurchaseUseCase)
	balanceHandler := api_balance.NewBalanceHandler(getBalanceUseCase, getPurchaseHistoriesUseCase)
	paymentCardHandler := api_paymentcard.NewHandler(issuePaymentCardUseCase, resolvePaymentCardUseCase)
	paymentCardClaimHandler := api_paymentcard.NewClaimHandler(paymentCardClaimUseCase, config.PublicBaseURL())
	paymentCardClaimOpenHandler := api_paymentcard.NewClaimOpenHandler(paymentCardClaimUseCase)
	memberHandler := api_member.NewHandler(memberUseCase)
	r := newRouter(handlers{
		user:     userHandler,
		item:     itemHandler,
		charge:   chargeHandler,
		purchase: purchaseHandler,
		balance:  balanceHandler,

		paymentCard:      paymentCardHandler,
		paymentCardClaim: paymentCardClaimHandler,
		member:           memberHandler,
	}, routerConfig{
		adminUser:      config.AdminUser(),
		adminPassword:  config.AdminPassword(),
		chargePassword: config.ChargePassword(),
		allowedOrigins: config.AllowedOrigins(),
		timeout:        requestTimeout,
	})

	// 部室の Wi-Fi に開ける入口（支払い用バーコードを受け取るページだけ）
	claimRouter := newClaimRouter(paymentCardClaimOpenHandler, requestTimeout)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	defer stop()

	servers := []*http.Server{
		{Addr: addr, Handler: r, ReadHeaderTimeout: readHeaderTimeout},
		{Addr: ":" + strconv.Itoa(ClaimPort), Handler: claimRouter, ReadHeaderTimeout: readHeaderTimeout},
	}
	for _, srv := range servers {
		l, err := net.Listen("tcp", srv.Addr)
		if err != nil {
			slog.Error("failed to listen", "addr", srv.Addr, "err", err)
			return err
		}
		slog.Info("Serve", "addr", srv.Addr)
		go func(srv *http.Server) {
			if err := srv.Serve(l); err != nil && err != http.ErrServerClosed {
				slog.Error("failed to serve", "addr", srv.Addr, "err", err)
			}
		}(srv)
	}

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	for _, srv := range servers {
		if err := srv.Shutdown(shutdownCtx); err != nil {
			slog.Error("failed to shutdown server", "addr", srv.Addr, "err", err)
		}
	}

	return nil
}
