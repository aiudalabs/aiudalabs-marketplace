# Workflows

Multi-step processes that coordinate skills and agents, such as "idea to published article". A workflow has the skill format and installs like a skill; it also declares the skills it requires and the agents it dispatches, so installing it brings everything.

Format: [docs/component-formats.md](../docs/component-formats.md#workflows).

## Running a workflow unattended

Workflows stop at gates for your approval. In a non-interactive run, such as `claude -p`, approve the gates in the prompt or the run ends at the first one.

In `claude -p`, Claude Code also ends the session when it has waited 600 seconds on background tasks, which cuts off a workflow whose agents run in the background. Set `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` to wait for them, or ask for the agents to run in the foreground.
