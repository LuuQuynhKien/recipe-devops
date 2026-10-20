#!/bin/bash
# Tao user theo nguyen tac quyen toi thieu (least privilege).
# Mat khau lay tu bien moi truong (file .env) - khong hard-code trong repo.
set -e

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOSQL
-- User cua ung dung web: chi duoc doc/ghi du lieu, khong duoc DROP/ALTER
CREATE USER IF NOT EXISTS 'recipe_app'@'%' IDENTIFIED BY '${APP_DB_PASSWORD}';
GRANT SELECT, INSERT ON \`${MYSQL_DATABASE}\`.* TO 'recipe_app'@'%';

-- User cua mysqld-exporter: chi du quyen doc so lieu thong ke
CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED BY '${EXPORTER_DB_PASSWORD}' WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';

FLUSH PRIVILEGES;
EOSQL
