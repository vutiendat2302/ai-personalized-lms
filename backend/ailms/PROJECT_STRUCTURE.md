```
.
├── .gitattributes
├── .gitignore
├── .mvn
│   └── wrapper
│       └── maven-wrapper.properties
├── mvnw
├── mvnw.cmd
├── pom.xml
└── src
    ├── main
    │   ├── java
    │   │   └── com
    │   │       └── ailms
    │   │           ├── AilmsApplication.java
    │   │           ├── common
    │   │           │   └── snowflake
    │   │           │       ├── SnowflakeId.java
    │   │           │       ├── SnowflakeIdGenerator.java
    │   │           │       └── SnowflakeIdGeneratorStrategy.java
    │   │           ├── config
    │   │           │   ├── JpaAuditingConfig.java
    │   │           │   └── SecurityConfig.java
    │   │           ├── controller
    │   │           │   ├── CategoryController.java
    │   │           │   ├── CourseController.java
    │   │           │   ├── CourseSectionController.java
    │   │           │   ├── LessonController.java
    │   │           │   └── LessonResourceController.java
    │   │           ├── entity
    │   │           │   ├── BaseEntity.java
    │   │           │   ├── CategoryEntity.java
    │   │           │   ├── CourseEntity.java
    │   │           │   ├── CourseSectionEntity.java
    │   │           │   ├── LessonEntity.java
    │   │           │   └── LessonResourceEntity.java
    │   │           ├── exception
    │   │           │   ├── BusinessException.java
    │   │           │   ├── DuplicateResourceException.java
    │   │           │   ├── GlobalExceptionHandler.java
    │   │           │   └── ResourceNotFoundException.java
    │   │           ├── mapper
    │   │           │   ├── CategoryMapper.java
    │   │           │   ├── CourseMapper.java
    │   │           │   ├── CourseSectionMapper.java
    │   │           │   ├── LessonMapper.java
    │   │           │   └── LessonResourceMapper.java
    │   │           ├── repository
    │   │           │   ├── CategoryRepository.java
    │   │           │   ├── CourseRepository.java
    │   │           │   ├── CourseSectionRepository.java
    │   │           │   ├── LessonRepository.java
    │   │           │   ├── LessonResourceRepository.java
    │   │           │   └── specification
    │   │           │       ├── CategorySpecification.java
    │   │           │       └── CourseSpecification.java
    │   │           ├── request
    │   │           │   ├── BaseSearchRequest.java
    │   │           │   ├── CategorySearchRequest.java
    │   │           │   ├── CategoryStatusRequest.java
    │   │           │   ├── CourseSearchRequest.java
    │   │           │   ├── CourseStatusRequest.java
    │   │           │   ├── CreateCategoryRequest.java
    │   │           │   ├── CreateCourseRequest.java
    │   │           │   ├── CreateLessonRequest.java
    │   │           │   ├── CreateResourceRequest.java
    │   │           │   ├── CreateSectionRequest.java
    │   │           │   ├── ReorderRequest.java
    │   │           │   ├── UpdateCategoryRequest.java
    │   │           │   ├── UpdateCourseRequest.java
    │   │           │   ├── UpdateLessonRequest.java
    │   │           │   ├── UpdateResourceRequest.java
    │   │           │   └── UpdateSectionRequest.java
    │   │           ├── response
    │   │           │   ├── ApiResponse.java
    │   │           │   ├── CategoryResponse.java
    │   │           │   ├── CourseResponse.java
    │   │           │   ├── ErrorResponse.java
    │   │           │   ├── LessonResponse.java
    │   │           │   ├── PageResponse.java
    │   │           │   ├── ResourceResponse.java
    │   │           │   └── SectionResponse.java
    │   │           └── service
    │   │               ├── CategoryService.java
    │   │               ├── CourseSectionService.java
    │   │               ├── CourseService.java
    │   │               ├── ICategoryService.java
    │   │               ├── ICourseSectionService.java
    │   │               ├── ICourseService.java
    │   │               ├── ILessonResourceService.java
    │   │               ├── ILessonService.java
    │   │               ├── LessonResourceService.java
    │   │               └── LessonService.java
    │   └── resources
    │       └── application.yaml
    └── test
        └── java
            └── com
                └── ailms
                    └── AilmsApplicationTests.java
```