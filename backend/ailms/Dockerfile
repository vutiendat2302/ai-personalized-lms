# Build stage
FROM maven:3-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Run stage
FROM eclipse-temurin:25-jre
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Đồng bộ đồng hồ nghiệp vụ với giờ Việt Nam khi tính lịch và trạng thái buổi học.
ENTRYPOINT ["java", "-Duser.timezone=Asia/Bangkok", "-jar", "app.jar"]
