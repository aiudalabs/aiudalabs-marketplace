# Workflows

Reserved for multi-step processes that coordinate several agents and skills, such as "idea to launch-ready brand".

The format is not defined yet. The validator and the CLI ignore this folder.

Until it is defined, model a workflow as a skill whose `SKILL.md` sequences other skills, and bundle the pieces in a [stack](../stacks/).

Open question for the design: whether a workflow needs its own manifest, or whether a skill plus a stack already covers it.
