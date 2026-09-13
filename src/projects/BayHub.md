---
slug: BayHub
repo: BayHub
title: BayHub
blurb: Game server management panel for Rust — player analytics, economy tracking, admin tools, and Discord integration.
order: 4
---

## Context

Built for a Rust game server community needing better admin tooling. Existing panels were either too generic or didn't integrate with the specific plugins and economy systems in use.

## What I Built

- **Player analytics**: Connection history, playtime, kill/death stats, clan membership
- **Economy tracking**: Balance history, transaction logs, shop purchase analytics
- **Admin tools**: Ban/mute/kick with Discord audit log, in-game command execution, player lookup
- **Discord integration**: Role sync from in-game ranks, economy alerts, event announcements
- **Plugin API**: Extensible system for Oxide/uMod plugins to register custom endpoints
- **Auth**: Steam OpenID for players, Discord OAuth for admins, role-based permissions

## Stack

TypeScript, React, Node.js, PostgreSQL, Redis, Discord.js, Steam OpenID, Oxide/uMod plugins

## Results

- Manages 500+ active players across multiple servers
- Sub-second dashboard loads with Redis caching
- Reduced admin workload by ~80% via Discord automation
- Plugin system allows community contributions without core changes