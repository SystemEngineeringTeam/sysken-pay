-- item.deleted_at を disabled_at に改名する（商品を「無効にして、あとで有効に戻せる」ようにするため）
-- deleted_at は今まで誰も書き込んでおらず、すべて NULL（＝有効）なので、データは変わらない
-- 実行方法は sysken-pay-backend/README.md の「DB の変更（マイグレーション）」を参照
-- 流す前に make backup で退避する。何度流しても壊れない（すでに disabled_at があれば何もしない）
-- 流したあとは API を作り直すこと（古い API は deleted_at を読んで 500 になる）
USE sysken_pay;

SET @rename_disabled_at = (
    SELECT IF(
        COUNT(*) > 0,
        'SELECT 1',
        IF(
            (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'item' AND COLUMN_NAME = 'deleted_at') > 0,
            'ALTER TABLE item CHANGE COLUMN deleted_at disabled_at TIMESTAMP NULL DEFAULT NULL',
            'SELECT 1'
        )
    )
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'item' AND COLUMN_NAME = 'disabled_at'
);
PREPARE rename_disabled_at FROM @rename_disabled_at;
EXECUTE rename_disabled_at;
DEALLOCATE PREPARE rename_disabled_at;
