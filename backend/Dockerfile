FROM golang:1.22-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM gcr.io/distroless/base-debian12

WORKDIR /app

COPY --from=build /app/server ./server
COPY --from=build /app/migrations ./migrations

EXPOSE 8080

ENV APP_PORT=8080

ENTRYPOINT ["/app/server"]

