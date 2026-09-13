---
slug: sessiondb-mcp
repo: sessiondb-mcp
title: SessionDB MCP
blurb: MCP server giving AI agents controlled, session-scoped access to SQL databases for real-time schema inspection and data querying.
order: 3
---

## Context

When working with AI agents on database tasks, they often need real-time schema context — but granting direct database access is risky. Model Context Protocol (MCP) provides a standardized way to expose tools safely.

## What I Built

- **Session model**: Each connection gets a token with explicit permissions (read, insert, update, delete, DDL), schema limits, timeout, and row limits
- **Schema tools**: List/describe tables, views, functions, relations, columns, indexes, constraints
- **Query tools**: Execute SELECT/INSERT/UPDATE/DELETE with parameter binding, row limits, and timeout enforcement
- **Multi-DB**: Multiple databases in same conversation without mixing connections
- **Transport**: stdio (for local agents) and HTTP/SSE (for remote agents)
- **Deployment**: Docker image with multi-arch support

## Stack

Python, MCP (Model Context Protocol), SQLAlchemy, PostgreSQL / MySQL / SQLite, Docker

## Results

- Used extensively to provide real-time database context during development
- Accelerates table creation, rules definition, and test verification
- Session tokens ensure agents only access what's explicitly permitted
- Not designed for production data — use with minimal-permission DB users and human review for destructive operations