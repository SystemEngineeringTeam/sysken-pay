-- 既存の DB に payment_card テーブルを追加する（init.sql は最初の起動時にしか実行されないため）
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
USE sysken_pay;

-- ---------------------------------
-- 6. payment_card テーブル (支払い用バーコード)
-- ---------------------------------
-- スマホに保存する支払い用バーコード。設計は docs/phone-payment.md。
-- バーコードの文字列そのものは保存せず、SHA-256 のハッシュだけを保存する。
-- 1人につき使える（revoked_at が NULL の）行は1つだけ。作り直すと古い行に revoked_at が入る。
CREATE TABLE IF NOT EXISTS payment_card (
    id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_payment_card_code_hash (code_hash),
    INDEX idx_payment_card_user (user_id, revoked_at),
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);
