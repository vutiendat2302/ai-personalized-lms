
# Database Design

## ID Generation Strategy

Different tables use different ID generation strategies based on their characteristics.

### 1. Snowflake ID
Used for tables that generate a large amount of data continuously.

Examples:
- user
- course
- lesson
- enrollment
- class_member
- quiz_attempt
- submission

### 2. Auto Increment / UUID / ULID
Used for small and relatively static tables.

Examples:
- role
- permission
- department
- category

### 3. Junction Tables (Many-to-Many)
Junction tables should **not** have an additional `id` column.

Instead, use a **composite primary key**.

Example:

```sql
PRIMARY KEY (course_id, user_id)
```

---

# Module 1. User & Authorization

## Tables

* user
* department
* role
* permission
* user_role
* role_permission

### Description

This module implements **RBAC (Role-Based Access Control)** for authentication and authorization.

---

# Module 2. Course Management

## Tables

* category
* course
* course_section
* lesson
* lesson_resource
* course_teacher

---

## category

| Column      | Type     | Description       |
| ----------- | -------- | ----------------- |
| id          | BIGINT   | Category ID       |
| name        | VARCHAR  | Category name     |
| description | TEXT     | Description       |
| status      | TINYINT  | Active / Inactive |
| created_at  | DATETIME | Created time      |
| created_by  | BIGINT   | Created by        |
| updated_at  | DATETIME | Updated time      |
| updated_by  | BIGINT   | Updated by        |

---

## course

| Column         | Type     | Description                        |
| -------------- | -------- | ---------------------------------- |
| id             | BIGINT   | Course ID                          |
| category_id    | BIGINT   | Category                           |
| name           | VARCHAR  | Course name                        |
| slug           | VARCHAR  | URL-friendly identifier            |
| description    | TEXT     | Course description                 |
| thumbnail_url  | VARCHAR  | Course thumbnail                   |
| level          | VARCHAR  | Beginner / Intermediate / Advanced |
| total_lessons  | INT      | Total lessons                      |
| total_duration | INT      | Total duration (minutes)           |
| status         | TINYINT  | Draft / Published / Archived       |
| created_at     | DATETIME | Created time                       |
| created_by     | BIGINT   | Created by                         |
| updated_at     | DATETIME | Updated time                       |
| updated_by     | BIGINT   | Updated by                         |

---

## course_section

| Column      | Type     | Description   |
| ----------- | -------- | ------------- |
| id          | BIGINT   | Section ID    |
| course_id   | BIGINT   | Parent course |
| name        | VARCHAR  | Section title |
| order_index | INT      | Display order |
| status      | TINYINT  | Status        |
| created_at  | DATETIME | Created time  |
| created_by  | BIGINT   | Created by    |
| updated_at  | DATETIME | Updated time  |
| updated_by  | BIGINT   | Updated by    |

---

## lesson

| Column       | Type     | Description               |
| ------------ | -------- | ------------------------- |
| id           | BIGINT   | Lesson ID                 |
| section_id   | BIGINT   | Parent section            |
| name         | VARCHAR  | Lesson title              |
| content_type | VARCHAR  | VIDEO / PDF / TEXT / LIVE |
| content_url  | VARCHAR  | Content URL               |
| description  | TEXT     | Description               |
| duration_min | INT      | Duration (minutes)        |
| is_preview   | BOOLEAN  | Preview lesson            |
| order_index  | INT      | Display order             |
| status       | TINYINT  | Status                    |
| created_at   | DATETIME | Created time              |
| created_by   | BIGINT   | Created by                |
| updated_at   | DATETIME | Updated time              |
| updated_by   | BIGINT   | Updated by                |

---

## lesson_resource

| Column     | Type     | Description             |
| ---------- | -------- | ----------------------- |
| id         | BIGINT   | Resource ID             |
| lesson_id  | BIGINT   | Parent lesson           |
| name       | VARCHAR  | Resource name           |
| file_url   | VARCHAR  | File URL                |
| file_type  | VARCHAR  | PDF / ZIP / DOCX / PPTX |
| file_size  | BIGINT   | File size (bytes)       |
| status     | TINYINT  | Status                  |
| created_at | DATETIME | Created time            |
| created_by | BIGINT   | Created by              |
| updated_at | DATETIME | Updated time            |
| updated_by | BIGINT   | Updated by              |

---

## course_teacher

Relationship between teachers and courses.

### Primary Key

```sql
PRIMARY KEY (course_id, user_id)
```

### Columns

| Column      | Type     | Description   |
| ----------- | -------- | ------------- |
| course_id   | BIGINT   | Course ID     |
| user_id     | BIGINT   | Teacher ID    |
| assigned_at | DATETIME | Assigned time |
| assigned_by | BIGINT   | Assigned by   |

---

# Module 3. Class Management

## Tables

* class
* class_member
* enrollment
* class_online

> Detailed database design for this module will be completed in the next phase.

---

# Development Progress

* [x] Initialize repository
* [x] Write README
* [x] Plan database modules
* [ ] Design ER Diagram
* [ ] User & Authorization Module
* [ ] Course Management Module
* [ ] Class Management Module
* [ ] Assessment Module
* [ ] AI Recommendation Module


