# Multi-stage build for the maistats record collector

# ============================================
# Builder Stage - Compiles the record collector
# ============================================
# rust:1.93-slim currently tracks Debian trixie; keep runtime stages on the same
# distro family/release so the Rust binaries and container libc stay aligned.
FROM rust:1.93-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY Cargo.toml ./
COPY Cargo.lock ./
COPY crates/ ./crates/
COPY maistats-record-collector/ ./maistats-record-collector/
# Copied so the workspace manifest resolves; only the collector is compiled.
COPY maistats-discord-bot/ ./maistats-discord-bot/
COPY maistats-song-info/ ./maistats-song-info/

# Build only the record collector. The Discord bot and its heavy render
# dependencies (image, imageproc, nalgebra, poise) are deliberately skipped.
RUN cargo build --release -p maistats-record-collector

# ============================================
# Target: maistats-record-collector
# ============================================
FROM debian:trixie-slim AS maistats-record-collector

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy record collector binary
COPY --from=builder /app/target/release/maistats-record-collector /usr/local/bin/maistats-record-collector

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["maistats-record-collector"]

