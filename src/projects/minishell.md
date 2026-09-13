---
slug: minishell
repo: minishell
title: minishell
blurb: Interactive shell in C reimplementing bash — tokenization, parsing, variable expansion, pipes, redirections, and builtins.
order: 1
---

## Context

Part of the 42 Rio curriculum, minishell is one of the most complex systems projects. The goal: build a functional shell from scratch in C, capable of executing real system commands with proper process management.

## What I Built

- **Lexer**: Input line tokenization handling quotes, operators, and special characters
- **Parser**: Builds command and operator trees from tokens with correct precedence
- **Expansion**: Environment variable expansion ($VAR), exit status ($?), quote handling
- **Execution**: Fork/execve with proper process queues and wait handling
- **Pipes**: Chained pipes via file descriptors (dup2, close, pipe)
- **Redirections**: Input (<), output (>), append (>>), heredoc (<<) with proper fd management
- **Signals**: Ctrl+C (SIGINT), Ctrl+D (EOF), Ctrl+\ (SIGQUIT) handling in interactive mode
- **Builtins**: echo, cd, pwd, export, unset, env, exit — all implemented from scratch

## Stack

C, POSIX (fork, execve, pipe, dup2), Makefile

## Results

- 100+ commits in local history, published to GitHub Jan 2026
- Complete shell pipeline: lex → parse → expand → execute
- Zero memory leaks (validated with valgrind)
- Handles edge cases: nested pipes, multiple redirections, quoted strings, signal forwarding