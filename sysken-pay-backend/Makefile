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
