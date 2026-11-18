-- 既存の DB に payment_card_claim テーブル（発行用 QR）を追加する
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
USE sysken_pay;

-- ---------------------------------
-- 7. payment_card_claim テーブル (支払い用バーコードの発行用 QR)
-- ---------------------------------
-- 発行用 QR は5分だけ有効。発行した支払い用バーコードを、QR に入れるトークンから作った鍵で暗号化して保存する。
-- トークンそのものは保存せず、SHA-256 のハッシュだけを保存する。期限切れの行は次に QR を作るときに消す。
CREATE TABLE IF NOT EXISTS payment_card_claim (
    id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    sealed_code VARBINARY(128) NOT NULL,
    open_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_payment_card_claim_token_hash (token_hash),
    INDEX idx_payment_card_claim_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);
