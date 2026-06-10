# Planar

**Living architecture diagrams from your Terraform plans — beautiful infra diffs, straight into your PRs.**

Planar turns the output of `terraform plan` into clean, grouped, executive-ready architecture diagrams. It abstracts away plumbing (IAM attachments, route associations, glue resources), groups what's left into logical containers, and — on a pull request — shows you the diff: green for created, red for destroyed, orange for changed.

> Status: pre-release. Milestone 1 (parser + intermediate representation) is in place. Layout, SVG rendering, and the GitHub Action follow.

## Why plan JSON, not `.tf`

Planar reads the resolved plan (`terraform show -json`), not raw HCL. That's the only way to get an accurate diff and to see resources fully expanded through `count`, `for_each`, and modules. The engine is a pure transform — it never runs Terraform or touches your credentials. Your CI pipeline produces the plan; Planar draws it.

## Quickstart (Milestone 1)

```bash
pnpm install

# Produce a plan document from any Terraform project:
#   terraform plan -out tfplan.bin
#   terraform show -json tfplan.bin > plan.json

# Or just try the bundled fixture:
pnpm cli test/fixtures/aws-basic.plan.json
pnpm test
```

## Roadmap

- [x] **M1** — Parse `terraform show -json` into a typed IR; prune plumbing; normalize status (incl. replace).
- [ ] **M1.5** — Logical grouping (merge subnet + NIC + instance into one container).
- [ ] **M2** — ELK hierarchical layout + themed SVG with cloud iconography (light/dark); conditional styling for the diff.
- [ ] **M3** — GitHub Action: post the diff on PRs, commit/update the SVG and README on merge.

## License

MIT