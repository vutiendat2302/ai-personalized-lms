"""Upload avatar thật lên MinIO và đồng bộ metadata cho 100 user báo cáo."""

from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from asset_storage import get_storage
from assets import AVATAR_ASSETS, validate_assets
from identity_dataset import PEOPLE
from snowflake_id import snowflake


def avatar_file_key(username: str) -> str:
    """Sinh file key avatar ổn định theo format thư mục của FileService backend."""
    object_uuid = uuid5(NAMESPACE_URL, f"ailms:{username}:avatar")
    return f"avatars/{object_uuid}.jpeg"


def get_users(cursor) -> dict[str, int]:
    """Lấy user ID thật cho toàn bộ username thuộc dataset."""
    usernames = tuple(person["username"] for person in PEOPLE)
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(f"SELECT id, username FROM user WHERE username IN ({placeholders})", usernames)
    users = {row["username"]: row["id"] for row in cursor.fetchall()}
    if len(users) != 100:
        raise ValueError(f"Cần đủ 100 users trước khi seed avatar, hiện có {len(users)}")
    return users


def synchronize_metadata(
    cursor,
    file_key: str,
    original_name: str,
    source: Path,
    user_id: int,
    admin_id: int,
    timestamp,
) -> bool:
    """Tạo hoặc cập nhật metadata AVATAR khớp object thật và chủ sở hữu UserEntity."""
    cursor.execute("SELECT id FROM file_metadata WHERE file_key=%s", (file_key,))
    existing = cursor.fetchone()
    values = (
        original_name,
        source.stat().st_size,
        "image/jpeg",
        "IMAGE",
        "ACTIVE",
        "AVATAR",
        user_id,
        "UserEntity",
        admin_id,
        timestamp,
    )
    if existing:
        cursor.execute(
            """
            UPDATE file_metadata
            SET original_name=%s, file_size=%s, content_type=%s, file_type=%s,
                status=%s, usage_type=%s, reference_entity_id=%s,
                reference_entity_type=%s, orphaned_detected_at=NULL,
                updated_by=%s, updated_at=%s
            WHERE id=%s
            """,
            (*values, existing["id"]),
        )
        return False

    cursor.execute(
        """
        INSERT INTO file_metadata (
            id, file_key, original_name, file_size, content_type, file_type,
            status, usage_type, reference_entity_id, reference_entity_type,
            orphaned_detected_at, created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, NULL, %s, %s)
        """,
        (
            snowflake.next_id(),
            file_key,
            original_name,
            source.stat().st_size,
            "image/jpeg",
            "IMAGE",
            "ACTIVE",
            "AVATAR",
            user_id,
            "UserEntity",
            admin_id,
            timestamp,
            timestamp,
        ),
    )
    return True


def seed(cursor) -> None:
    """Upload 100 avatar riêng biệt rồi liên kết user.avatar_url bằng raw file key."""
    print("→ Uploading and seeding final-report avatars...")
    validate_assets()
    users = get_users(cursor)
    admin_id = users["admin.report"]
    storage = get_storage()
    uploaded = 0
    metadata_inserted = 0
    metadata_updated = 0

    for index, person in enumerate(PEOPLE):
        asset = AVATAR_ASSETS[index % len(AVATAR_ASSETS)]
        source = asset["source"]
        file_key = avatar_file_key(person["username"])
        uploaded += int(storage.upload_if_absent(source, file_key, asset["content_type"]))
        storage.verify(file_key, source.stat().st_size)
        was_inserted = synchronize_metadata(
            cursor,
            file_key,
            f"avatar-{person['username']}.jpeg",
            source,
            users[person["username"]],
            admin_id,
            person["created_at"],
        )
        metadata_inserted += int(was_inserted)
        metadata_updated += int(not was_inserted)
        cursor.execute(
            "UPDATE user SET avatar_url=%s, updated_by=%s, updated_at=%s WHERE id=%s",
            (file_key, admin_id, person["created_at"], users[person["username"]]),
        )

    print(
        f"   [completed] avatars: uploaded={uploaded}, reused={100 - uploaded}, "
        f"metadata_inserted={metadata_inserted}, metadata_synchronized={metadata_updated}"
    )
