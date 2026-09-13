---
slug: cloudflare-ddns
repo: cloudflare-ddns
title: Cloudflare DDNS
blurb: DDNS client that updates Cloudflare A and AAAA records with the machine's current public IP.
order: 2
---

## Context

Needed a reliable way to keep DNS records in sync with a dynamic public IP for home lab services. Existing solutions were either too complex or lacked the specific features needed.

## What I Built

- **IP detection**: Fetches public IPv4 and IPv6 from multiple providers with fallback
- **Cloudflare API**: Updates A and AAAA records via API token or global API key
- **Configuration**: TOML config with validation before applying changes
- **Notifications**: Discord webhook support for success/failure alerts
- **Safety**: Dry-run mode, config validation, idempotent updates (only changes when IP differs)
- **Deployment**: Systemd service + timer for automatic periodic runs

## Stack

Python, Cloudflare API, IPv4 / IPv6, Discord webhooks, systemd

## Results

- Running on multiple machines for 18+ months without issues
- Handles IPv6 privacy extensions correctly
- Zero-downtime DNS updates for self-hosted services
- Simple enough to audit, robust enough to trust