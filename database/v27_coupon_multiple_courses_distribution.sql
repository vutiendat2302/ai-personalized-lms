-- Support multiple applicable courses and distinguish voucher distribution scope.

ALTER TABLE coupon
    ADD COLUMN distribution_scope VARCHAR(30) NOT NULL DEFAULT 'NONE';

CREATE TABLE IF NOT EXISTS coupon_course (
    coupon_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, course_id),
    CONSTRAINT fk_coupon_course_coupon FOREIGN KEY (coupon_id) REFERENCES coupon (id),
    CONSTRAINT fk_coupon_course_course FOREIGN KEY (course_id) REFERENCES course (id)
);

INSERT IGNORE INTO coupon_course (coupon_id, course_id)
SELECT id, applicable_course_id FROM coupon WHERE applicable_course_id IS NOT NULL;
