package paymentcard

import (
	"context"
	"errors"
	"fmt"

	domainpc "sysken-pay-api/app/domain/object/paymentcard"
	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
)

var (
	// ErrClaimNotFound は発行用 QR が存在しない（API では 404）
	ErrClaimNotFound = errors.New("claim not found")
	// ErrClaimExpired は発行用 QR の期限（5分）が切れている（API では 410）
	ErrClaimExpired = errors.New("claim expired")
)

// CreatedClaim は作った発行用 QR。Token は QR に入れる値で、このときにしか取り出せない
type CreatedClaim struct {
	ClaimID   int64
	Token     string
	User      *domainuser.User
	ExpiresIn int // 秒
}

// ClaimStatus は管理者画面に出す、発行用 QR の状態
type ClaimStatus struct {
	OpenCount        int
	RemainingSeconds int
}

// OpenedClaim はスマホで発行用 QR を開いたときに返すもの
type OpenedClaim struct {
	User *domainuser.User
	Code string
}

type ClaimUseCase interface {
	// CreateClaim は支払い用バーコードを発行し（古いものは使えなくなる）、5分だけ有効な発行用 QR を作る
	CreateClaim(ctx context.Context, userID string) (*CreatedClaim, error)
	// Status は発行用 QR の状態（開かれた回数・残り時間）を返す
	Status(ctx context.Context, claimID int64) (*ClaimStatus, error)
	// Open はスマホで発行用 QR を開いたときに、支払い用バーコードを返す（期限内なら何度でも）
	Open(ctx context.Context, token string) (*OpenedClaim, error)
}

type ClaimServiceImpl struct {
	userRepo      repository.UserRepository
	cardRepo      repository.PaymentCardRepository
	claimRepo     repository.PaymentCardClaimRepository
	tx            repository.Transaction
	generateCode  func() (string, error)
	generateToken func() (string, error)
}

func NewClaimUseCase(
	userRepo repository.UserRepository,
	cardRepo repository.PaymentCardRepository,
	claimRepo repository.PaymentCardClaimRepository,
	tx repository.Transaction,
) *ClaimServiceImpl {
	return &ClaimServiceImpl{
		userRepo: userRepo, cardRepo: cardRepo, claimRepo: claimRepo, tx: tx,
		generateCode: domainpc.GenerateCode, generateToken: domainpc.GenerateClaimToken,
	}
}

func (s *ClaimServiceImpl) CreateClaim(ctx context.Context, userID string) (*CreatedClaim, error) {
	if err := (&domainuser.User{}).SetUserID(userID); err != nil {
		return nil, err
	}
	u, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, fmt.Errorf("%w: userID=%s", ErrUserNotFound, userID)
	}

	code, err := s.generateCode()
	if err != nil {
		return nil, err
	}
	token, err := s.generateToken()
	if err != nil {
		return nil, err
	}
	sealed, err := domainpc.SealCode(token, code)
	if err != nil {
		return nil, err
	}

	var claimID int64
	// 支払い用バーコードの作り直しと、発行用 QR の保存を1つのトランザクションで行う
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.cardRepo.RevokeActiveByUserID(ctx, userID); err != nil {
			return err
		}
		if err := s.cardRepo.Insert(ctx, userID, domainpc.HashCode(code)); err != nil {
			return err
		}
		if err := s.claimRepo.DeleteExpiredClaims(ctx); err != nil {
			return err
		}
		id, err := s.claimRepo.InsertClaim(ctx, userID, domainpc.HashClaimToken(token), sealed, domainpc.ClaimTTLSeconds)
		claimID = id
		return err
	})
	if err != nil {
		return nil, err
	}

	return &CreatedClaim{ClaimID: claimID, Token: token, User: u, ExpiresIn: domainpc.ClaimTTLSeconds}, nil
}

func (s *ClaimServiceImpl) Status(ctx context.Context, claimID int64) (*ClaimStatus, error) {
	c, err := s.claimRepo.FindClaimByID(ctx, claimID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, ErrClaimNotFound
	}
	remaining := c.RemainingSeconds
	if remaining < 0 {
		remaining = 0
	}
	return &ClaimStatus{OpenCount: c.OpenCount, RemainingSeconds: remaining}, nil
}

func (s *ClaimServiceImpl) Open(ctx context.Context, token string) (*OpenedClaim, error) {
	if err := domainpc.ValidateClaimToken(token); err != nil {
		return nil, err
	}
	c, err := s.claimRepo.FindClaimByTokenHash(ctx, domainpc.HashClaimToken(token))
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, ErrClaimNotFound
	}
	if c.Expired() {
		return nil, ErrClaimExpired
	}
	code, err := domainpc.OpenCode(token, c.SealedCode)
	if err != nil {
		return nil, err
	}
	u, err := s.userRepo.GetUserByID(ctx, c.UserID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, ErrClaimNotFound
	}
	// 他の人に先に開かれたら気づけるように、開かれた回数を数える（管理者画面に出す）
	if err := s.claimRepo.IncrementOpenCount(ctx, c.ID); err != nil {
		return nil, err
	}
	return &OpenedClaim{User: u, Code: code}, nil
}
