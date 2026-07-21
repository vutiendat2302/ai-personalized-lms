
import time
import threading
 
 
class SnowflakeGenerator:
    EPOCH_MS = 1700000000000  # mốc thời gian tùy chỉnh (2023-11-14)
 
    def __init__(self, datacenter_id: int = 1, worker_id: int = 1):
        if not (0 <= datacenter_id < 32):
            raise ValueError("datacenter_id phải trong khoảng 0-31")
        if not (0 <= worker_id < 32):
            raise ValueError("worker_id phải trong khoảng 0-31")
        self.datacenter_id = datacenter_id
        self.worker_id = worker_id
        self.sequence = 0
        self.last_ts = -1
        self._lock = threading.Lock()
 
    def _current_millis(self) -> int:
        return int(time.time() * 1000)
 
    def next_id(self) -> int:
        with self._lock:
            ts = self._current_millis()
            if ts == self.last_ts:
                self.sequence = (self.sequence + 1) & 0xFFF  # 12 bit
                if self.sequence == 0:
                    # hết sequence trong cùng 1ms -> chờ sang ms tiếp theo
                    while ts <= self.last_ts:
                        ts = self._current_millis()
            else:
                self.sequence = 0
            self.last_ts = ts
            return (
                ((ts - self.EPOCH_MS) << 22)
                | (self.datacenter_id << 17)
                | (self.worker_id << 12)
                | self.sequence
            )
 
 
# Instance dùng chung (singleton) cho toàn bộ project seed
snowflake = SnowflakeGenerator(datacenter_id=1, worker_id=1)