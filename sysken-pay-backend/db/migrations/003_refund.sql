-- 既存の DB に refund テーブル（返金）を追加する
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
USE sysken_pay;

-- ---------------------------------
-- 8. refund テーブル (返金)
-- ---------------------------------
-- 退部・卒業のときに、残高を現金で返した記録。返す額はその人の残高ちょうど。
-- 会計の記録なので消さない。残高（balance）にはマイナスの行を入れ、その行を balance_id で指す。
CREATE TABLE IF NOT EXISTS refund (
    id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    amount INT NOT NULL CHECK (amount > 0),
    balance_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_refund_balance (balance_id),
    INDEX idx_refund_user (user_id),
    FOREIGN KEY (user_id) REFERENCES `user`(id),
    FOREIGN KEY (balance_id) REFERENCES balance(id)
);
