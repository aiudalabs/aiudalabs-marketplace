# Brand governance

A brand guide is a living document. Without an owner, a version and a way to say "this is a deliberate exception", it drifts until nobody trusts it.

## Owner

Name one person. A team name is not an owner. The owner approves changes and exceptions and is who people ask when the guide is silent.

In a very small company this is usually a founder. Say so in the guide anyway.

## Versioning

Version the guide like software, so people can tell how much changed.

| Change | Bump | Examples |
| --- | --- | --- |
| Clarification that changes no rule | Patch (0.1.0 to 0.1.1) | Fixed a typo, added an example, reworded a rule |
| New rule or new element, nothing existing breaks | Minor (0.1.0 to 0.2.0) | Added an icon style, added a dark mode role map |
| A change that makes existing material off-brand | Major (0.x to 1.0, 1.x to 2.0) | New primary color, new typeface, new logo |

Keep the tokens file on the same version as the guide. They describe the same decisions.

Record every version in the changelog with its date and a one-line summary.

## Changing a rule

1. **Request.** Anyone can propose a change, stating the problem with the current rule and a concrete case where it failed.
2. **Check against the attributes.** A change must serve a brand attribute better than the current rule does. "It looks nicer" is taste, and taste is the owner's call, stated as such.
3. **Assess the cost.** List what existing material becomes off-brand and who updates it.
4. **Decide.** The owner approves or declines, and records the reason either way.
5. **Publish.** Update the guide and the tokens together, bump the version, and tell the people who make things with the brand.

## Exceptions

Sometimes the right call is to break a rule once: a partner's co-branding requirement, a print process that cannot reproduce a color, a campaign with its own look.

An exception is fine. An unrecorded exception becomes the new rule by accident. Log each one:

| Field | Content |
| --- | --- |
| Date | When it was approved |
| What differs | The rule being broken, and how |
| Where | The specific piece or context |
| Why | The reason the rule does not fit here |
| Approved by | The owner |
| Expires | A date, or "permanent for this context" |

If the same exception is granted three times, the rule is wrong. Change the rule.

## Reviewing work against the guide

When checking a piece of work:

1. Check it against the guide section by section, in this order: attributes, color, typography, logo, imagery.
2. For each problem, name the rule it breaks, the reason the rule exists, and the smallest change that fixes it.
3. Separate rule violations from matters of taste. Label taste as taste.
4. If the work reveals a case the guide does not cover, that is a gap in the guide. Add it to the open questions.

## Rollout after a major change

- List every place the brand appears: website, product, social profiles, email signatures, documents, decks, signage, packaging.
- Order them by visibility and update the most visible first.
- Set a date after which the old version is no longer acceptable, and remove old files from shared folders on that date.
