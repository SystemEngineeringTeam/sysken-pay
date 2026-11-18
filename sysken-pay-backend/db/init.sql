-- データベースがなければ作成する
CREATE DATABASE IF NOT EXISTS sysken_pay;

-- 'sysken_pay' データベースを使用する
USE sysken_pay;

-- ---------------------------------
-- 1. user テーブル (ユーザー)
-- ---------------------------------
CREATE TABLE `user` (
    -- 学籍番号フォーマット: 2桁の入学年度数字 + 1文字のアルファベット + 数字の連番 (例: 20K23099)
    id VARCHAR(20) NOT NULL CHECK (id REGEXP '^[0-9]{2}[A-Za-z][0-9]+$'),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    PRIMARY KEY (id)
);

-- ---------------------------------
-- 2. item テーブル (商品)
-- ---------------------------------
CREATE TABLE item (
    id INT NOT NULL AUTO_INCREMENT,
    jan_code VARCHAR(13) NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    price INT NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    PRIMARY KEY (id)
);

-- ---------------------------------
-- 3. charge テーブル (チャージ履歴)
-- ---------------------------------
CREATE TABLE charge (
    id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    amount INT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);

-- ---------------------------------
-- 4. purchase テーブル (購入履歴)
-- ---------------------------------
CREATE TABLE purchase (
    id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES `user`(id)
);

CREATE TABLE purchase_item (
    id INT NOT NULL AUTO_INCREMENT,
    purchase_id INT NOT NULL,  
    item_id INT NOT NULL,      
    quantity INT NOT NULL,     
    price_at_purchase INT NOT NULL, 
    
    PRIMARY KEY (id),
    FOREIGN KEY (purchase_id) REFERENCES purchase(id),
    FOREIGN KEY (item_id) REFERENCES item(id)
);

-- ---------------------------------
-- 5. balance テーブル (残高変動ログ)
-- ---------------------------------
-- ユーザーごとの残高レコードを更新(UPDATE)し続けると、アクセス集中時に行ロックの競合が発生しやすくなります。
-- そのため、入出金の履歴を追記(INSERT)していき、残高は SUM(amount) で算出する設計にします。
-- これにより、chargeとpurchaseの両方と紐づく中間テーブルのような役割も果たします。
CREATE TABLE balance (
    id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(20) NOT NULL,
    charge_id INT DEFAULT NULL,   -- チャージ由来の場合にIDが入る
    purchase_id INT DEFAULT NULL, -- 購入由来の場合にIDが入る
    amount INT NOT NULL,          -- 変動額（入金はプラス、出金はマイナス）
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES `user`(id),
    FOREIGN KEY (charge_id) REFERENCES charge(id),
    FOREIGN KEY (purchase_id) REFERENCES purchase(id),
    
    INDEX idx_user_id (user_id) -- 残高集計(SUM)を高速化するためのインデックス
);


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
