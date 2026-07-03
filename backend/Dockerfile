FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
# Copy all source first so go mod tidy can resolve imports
COPY . .
RUN go mod tidy && go build -ldflags="-s -w" -o server .

# Dev stage: reuses the builder toolchain. No external installs (nothing to
# fail at build time). Source is bind-mounted via docker-compose.override.yml;
# `go mod tidy` reconciles the (possibly empty) host go.sum before running.
FROM builder AS dev
EXPOSE 8080
CMD ["sh", "-c", "go mod tidy && go run ."]

# Keep runner last: builds without --target (e.g. Railway) default to the
# final stage, which must be the production image.
FROM alpine:3.19 AS runner
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
