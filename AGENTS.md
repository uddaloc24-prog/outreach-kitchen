# Agent Orchestration — Interview System

> Mirrors CLAUDE.md for any AI environment.

## Agent Roles

### Parent Agent (Claude Code / Main)
- Orchestrates all subagents
- Makes architectural decisions
- Applies all code changes
- Reads subagent reports and acts on them

### Subagents

| Agent | When to Use | What It Returns |
|-------|------------|----------------|
| `planner` | Before building any new script | Step-by-step implementation plan |
| `code-reviewer` | After writing/editing any script | Issues by severity (CRITICAL/HIGH/MEDIUM/LOW) + PASS/FAIL |
| `tdd-guide` | When writing new scripts | Test-first implementation guidance |
| `security-reviewer` | Before any commit or deploy | Security issues + remediation steps |
| `research` | When unsure about Gmail API, Claude API usage | Sourced findings summary |

---

## Standard Build Loop

For every new script:

```
1. Write the script
2. Spawn code-reviewer → read report → fix all CRITICAL/HIGH
3. Spawn tdd-guide → write tests → confirm passing
4. Only then: mark task complete
```

---

## Parallel Execution

When reviewing multiple independent files, run subagents in parallel:

```
# Example: reviewing generate_email.py and send_email.py at the same time
Spawn in parallel:
- code-reviewer on scripts/generate_email.py
- code-reviewer on scripts/send_email.py
```

---

## Decision Log

Use this section to record key architectural decisions:

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-27 | Use Gmail API (OAuth2) over SMTP | More reliable, no 2FA issues, supports reply tracking |
| 2026-03-27 | Use Claude API for email generation | Personalized emails, not templates |
| 2026-03-27 | Google Sheets for tracking | Easy to view/edit manually, no DB needed for MVP |
| 2026-03-27 | Python for all scripts | Gmail API + Anthropic SDK both have first-class Python support |
