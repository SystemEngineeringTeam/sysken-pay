up:
	docker compose build --no-cache && docker compose up
# 注意: down はコンテナを消す。DB のデータは mysql_data ボリュームに残る（down -v はデータごと消えるので使わない）
down:
	docker compose down
restart:
	docker compose restart
logs:
	docker compose logs -f
login:
	docker exec -it sysken-db mysql -u root -p
backup:
	./scripts/backup-db.sh
restore:
	./scripts/restore-db.sh $(FILE)
# DB の変更（マイグレーション）。docs は README の「DB の変更（マイグレーション）」
# 当てたものとまだのものを一覧で出す（DB は変えない）
migrate-status:
	./scripts/migrate.sh status
# まだ当てていないものだけ、番号の順に当てる（先に自動でバックアップを取る）。1つ失敗したらそこで止まる
# 注意: MySQL の CREATE / ALTER / DROP はトランザクションで戻せない（失敗したら途中まで反映されていることがある）
migrate-up:
	./scripts/migrate.sh up
# 【最初の1回だけ・手で打つ】001〜UPTO を「当てたことにする」印だけつける（SQL は流さない）。例: make migrate-baseline UPTO=004
migrate-baseline:
	./scripts/migrate.sh baseline $(UPTO)
# 廃止。誤って使われないよう、案内を出して止める
migrate:
	@echo "make migrate FILE=... は廃止しました。代わりに make migrate-up を使ってください（まだのものだけ、番号の順に当てます）。"
	@echo "当てる前の確認は make migrate-status です。最初の1回だけは make migrate-baseline UPTO=004 が必要です。"
	@exit 1
