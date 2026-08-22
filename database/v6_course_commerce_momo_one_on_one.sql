-- Course detail, MoMo idempotency and one-on-one matching support.
-- Review duplicate enrollments/payment references before applying unique constraints to existing production data.

ALTER TABLE course
    ADD COLUMN thumbnail_url VARCHAR(500) NULL,
    ADD COLUMN learning_objectives TEXT NULL,
    ADD COLUMN prerequisites TEXT NULL;

ALTER TABLE class
    ADD COLUMN class_kind VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN description TEXT NULL,
    ADD COLUMN registration_open BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN allow_late_enrollment BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE class_online
    ADD COLUMN session_kind VARCHAR(20) NOT NULL DEFAULT 'REGULAR',
    ADD COLUMN counts_toward_package BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN payable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE order_item
    ADD COLUMN one_on_one_needs TEXT NULL;

ALTER TABLE payment_transaction
    ADD COLUMN momo_request_id VARCHAR(100) NULL,
    ADD COLUMN gateway_order_id VARCHAR(100) NULL,
    ADD COLUMN momo_trans_id VARCHAR(100) NULL,
    ADD CONSTRAINT uk_payment_momo_request_id UNIQUE (momo_request_id),
    ADD CONSTRAINT uk_payment_gateway_order_id UNIQUE (gateway_order_id),
    ADD CONSTRAINT uk_payment_momo_trans_id UNIQUE (momo_trans_id);

ALTER TABLE enrollment
    ADD CONSTRAINT uk_enrollment_user_course UNIQUE (user_id, course_id);

ALTER TABLE enrollment_package
    ADD CONSTRAINT uk_enrollment_package_order_item UNIQUE (order_item_id);

CREATE TABLE one_on_one_request (
    id BIGINT NOT NULL,
    enrollment_package_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    assigned_instructor_id BIGINT NULL,
    trial_class_id BIGINT NULL,
    trial_session_id BIGINT NULL,
    status VARCHAR(40) NOT NULL,
    available_period VARCHAR(255) NULL,
    available_days VARCHAR(255) NULL,
    preferred_times VARCHAR(500) NULL,
    current_level VARCHAR(255) NULL,
    learning_situation TEXT NULL,
    learning_goals TEXT NULL,
    weak_areas TEXT NULL,
    instructor_preferences TEXT NULL,
    additional_notes TEXT NULL,
    review_current_level TEXT NULL,
    review_weak_areas TEXT NULL,
    review_attitude TEXT NULL,
    review_recommended_path TEXT NULL,
    review_notes TEXT NULL,
    accepted_at DATETIME NULL,
    contacted_at DATETIME NULL,
    trial_completed_at DATETIME NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_one_on_one_enrollment_package UNIQUE (enrollment_package_id),
    CONSTRAINT fk_one_on_one_enrollment_package FOREIGN KEY (enrollment_package_id) REFERENCES enrollment_package(id),
    CONSTRAINT fk_one_on_one_student FOREIGN KEY (student_id) REFERENCES user(id),
    CONSTRAINT fk_one_on_one_assignee FOREIGN KEY (assigned_instructor_id) REFERENCES user(id),
    CONSTRAINT fk_one_on_one_trial_class FOREIGN KEY (trial_class_id) REFERENCES class(id),
    CONSTRAINT fk_one_on_one_trial_session FOREIGN KEY (trial_session_id) REFERENCES class_online(id),
    INDEX idx_one_on_one_status (status),
    INDEX idx_one_on_one_assignee (assigned_instructor_id)
);

CREATE TABLE one_on_one_rejected_instructor (
    id BIGINT NOT NULL,
    request_id BIGINT NOT NULL,
    instructor_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    created_by BIGINT NULL,
    updated_at DATETIME NULL,
    updated_by BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_one_on_one_rejected UNIQUE (request_id, instructor_id),
    CONSTRAINT fk_one_on_one_rejected_request FOREIGN KEY (request_id) REFERENCES one_on_one_request(id),
    CONSTRAINT fk_one_on_one_rejected_instructor FOREIGN KEY (instructor_id) REFERENCES user(id)
);
