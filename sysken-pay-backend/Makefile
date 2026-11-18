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
# DB の変更（マイグレーション）。先に必ずバックアップを取る
# 例: make migrate FILE=db/migrations/001_payment_card.sql
migrate:
	./scripts/backup-db.sh
	docker exec -i sysken-db sh -c 'exec mysql -uroot -p"$$MYSQL_ROOT_PASSWORD"' < $(FILE)
