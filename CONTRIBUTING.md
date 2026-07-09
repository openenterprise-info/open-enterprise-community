# Contributing to Open Enterprise

Thank you for your interest in contributing. This document explains how the process works and what gets accepted.

## Before You Start

Open an issue first before writing code. This lets us align on whether the change fits the project direction before you invest time building it. PRs that arrive without a prior discussion may be closed even if the code is good.

## What Gets Accepted

**Likely accepted:**
- Bug fixes with a clear reproduction case
- Connector improvements (better error handling, missing fields, edge cases)
- Sample agents for common real-world workflows
- Documentation corrections and clarity improvements
- Performance fixes with measurable impact

**Unlikely accepted:**
- Large architectural changes without prior discussion
- New features that belong in the Enterprise edition
- Dependencies that significantly increase bundle size
- Opinionated refactors that don't fix a real problem

## How to Submit a PR

1. Fork the repo and create a branch from `main`
2. Name your branch descriptively: `fix/connector-timeout`, `feat/slack-connector`, `docs/docker-setup`
3. Keep PRs focused — one fix or feature per PR
4. Fill in the PR template completely
5. All PRs require at least one approval from a maintainer before merging

## Code Standards

- Match the style of the surrounding code
- No commented-out code
- No `console.log` left in production paths
- If you add a new dependency, explain why an existing one couldn't work

## Reporting Bugs

Use the Bug Report issue template. Include:
- What you did
- What you expected
- What actually happened
- Your environment (OS, Docker version, LLM provider)

## Security Issues

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md).

## Questions

Open a GitHub Discussion rather than an issue if you have a question about how something works or whether an idea is worth pursuing.
