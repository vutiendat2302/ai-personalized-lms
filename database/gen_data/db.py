
import os
import pymysql
from pymysql.cursors import DictCursor
 
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "123456"),
    "database": os.getenv("DB_NAME", "ailms"),
    "charset": "utf8mb4",
    "cursorclass": DictCursor,
}
 
 
def get_connection():
    """Tạo kết nối mới tới MySQL."""
    return pymysql.connect(**DB_CONFIG)