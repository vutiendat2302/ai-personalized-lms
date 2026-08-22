"""
backdate_orders.py
Rải đều paid_at / created_at của PAID orders ra 90 ngày qua
để biểu đồ doanh thu 30 ngày hiển thị growth curve đẹp thay vì cắm đứng 1 ngày.
Chạy SAU khi commerce phase hoàn tất.
"""
from __future__ import annotations
import random
import subprocess
from datetime import datetime, timedelta

DAYS_BACK = 90
GROWTH_WEIGHT_RECENT = 3  # Ngày gần đây nhiều hơn 3x so với 90 ngày trước


def mysql_exec(sql: str) -> str:
    """Chạy SQL trong container MySQL và trả stdout."""
    cmd = [
        "docker", "exec", "ailms-mysql-docker",
        "mysql", "-u", "ailms_user", "-p123456", "ailms",
        "-e", sql, "--batch", "--silent",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"MySQL error: {result.stderr.strip()}")
    return result.stdout.strip()


def get_paid_order_ids() -> list[str]:
    """Lấy tất cả order PAID để backdate."""
    out = mysql_exec("SELECT id FROM `order` WHERE status='PAID' ORDER BY created_at;")
    return [line.strip() for line in out.splitlines() if line.strip()]


def get_transaction_ids_for_order(order_id: str) -> list[str]:
    """Lấy payment_transaction SUCCESS của order để đồng bộ timestamp."""
    out = mysql_exec(
        f"SELECT id FROM payment_transaction WHERE order_id={order_id} AND status='SUCCESS';"
    )
    return [line.strip() for line in out.splitlines() if line.strip()]


def random_past_date(rng: random.Random) -> datetime:
    """
    Sinh ngày ngẫu nhiên trong [now - DAYS_BACK, now].
    Weighted tăng dần về hiện tại để mô phỏng growth curve tự nhiên.
    """
    now = datetime.now()
    # d=1 gần nhất, d=DAYS_BACK xa nhất
    weights = []
    for d in range(1, DAYS_BACK + 1):
        progress = 1 - (d / DAYS_BACK)
        w = 1 + progress * (GROWTH_WEIGHT_RECENT - 1)
        weights.append(w)
    days_ago = rng.choices(range(1, DAYS_BACK + 1), weights=weights, k=1)[0]
    offset = timedelta(
        days=days_ago,
        hours=rng.randint(7, 22),
        minutes=rng.randint(0, 59),
        seconds=rng.randint(0, 59),
    )
    return now - offset


def fmt(dt: datetime) -> str:
    """Format datetime sang chuỗi MySQL."""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def backdate_all() -> None:
    """Backdate toàn bộ PAID orders + transactions ra 90 ngày — idempotent (seed cố định)."""
    print("📅 Đang backdate PAID orders...")
    order_ids = get_paid_order_ids()
    if not order_ids:
        print("   Không có order PAID nào. Hãy chạy commerce trước.")
        return

    print(f"   Tìm thấy {len(order_ids)} PAID orders")
    rng = random.Random(20240101)  # seed cố định → idempotent khi chạy lại

    updated_orders = updated_tx = 0
    for oid in order_ids:
        paid_dt = random_past_date(rng)
        paid_str = fmt(paid_dt)
        created_dt = paid_dt - timedelta(minutes=rng.randint(2, 30))
        created_str = fmt(created_dt)

        mysql_exec(
            f"UPDATE `order` SET paid_at='{paid_str}', created_at='{created_str}', "
            f"updated_at='{paid_str}' WHERE id={oid};"
        )
        updated_orders += 1

        for tid in get_transaction_ids_for_order(oid):
            mysql_exec(
                f"UPDATE payment_transaction SET created_at='{paid_str}', "
                f"updated_at='{paid_str}' WHERE id={tid};"
            )
            updated_tx += 1

    print(f"✅ Backdate xong: {updated_orders} orders, {updated_tx} transactions")

    out = mysql_exec(
        "SELECT DATE(paid_at) as day, COUNT(*) as cnt "
        "FROM `order` WHERE status='PAID' "
        "GROUP BY day ORDER BY day DESC LIMIT 15;"
    )
    print("\n📊 Phân phối orders theo ngày (15 ngày gần nhất):")
    for line in out.splitlines():
        print(f"   {line}")


if __name__ == "__main__":
    backdate_all()
