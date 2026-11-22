package adminunlock

import (
	"context"
	"errors"
	"testing"

	domainuser "sysken-pay-api/app/domain/object/user"
	"sysken-pay-api/app/domain/repository"
	"sysken-pay-api/app/usecase/paymentcard"
)

type fakeResolve struct {
	userID string
	err    error
}

func (f fakeResolve) Resolve(context.Context, string) (*domainuser.User, error) {
	if f.err != nil {
		return nil, f.err
	}
	u := &domainuser.User{}
	if err := u.SetUserID(f.userID); err != nil {
		return nil, err
	}
	return u, nil
}

type fakeAllow struct {
	repository.AdminAllowlistRepository
	ids map[string]bool
	err error
}

func (f fakeAllow) ExistsByStudentID(_ context.Context, id string) (bool, error) {
	return f.ids[id], f.err
}

func TestUnlock(t *testing.T) {
	admins := map[string]bool{"X24042": true}
	boom := errors.New("db down")
	tests := []struct {
		name    string
		resolve fakeResolve
		allow   fakeAllow
		want    error
	}{
		{"許可リストにいる人は通る", fakeResolve{userID: "20X24042"}, fakeAllow{ids: admins}, nil},
		{"許可リストにいない部員は ErrNotAdmin", fakeResolve{userID: "20K23099"}, fakeAllow{ids: admins}, ErrNotAdmin},
		{"バーコードが見つからなければそのまま返す", fakeResolve{err: paymentcard.ErrCardNotFound}, fakeAllow{ids: admins}, paymentcard.ErrCardNotFound},
		{"利用停止した人は通らない", fakeResolve{err: domainuser.ErrUserStopped}, fakeAllow{ids: admins}, domainuser.ErrUserStopped},
		{"許可リストを引けなければエラー（通さない）", fakeResolve{userID: "20X24042"}, fakeAllow{err: boom}, boom},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := NewUseCase(tt.resolve, tt.allow).Unlock(context.Background(), "SP-anything")
			if !errors.Is(err, tt.want) {
				t.Fatalf("err = %v, want %v", err, tt.want)
			}
		})
	}
}
