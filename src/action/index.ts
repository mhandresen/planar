import * as fs from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { planToSvg } from "../core/pipeline.js";
import type { TerraformPlan } from "../core/plan.js";
import type { ThemeName } from "../core/theme.js";

async function run(): Promise<void> {
  try {
    const planPath = core.getInput("plan", { required: true });
    const outputPath = core.getInput("output") || ".planar/diagram.svg";
    const theme: ThemeName = core.getInput("theme") === "dark" ? "dark" : "light";
    const message = core.getInput("commit-message") || "chore: updated Planar diagram";
    const token = core.getInput("token") || process.env.GITHUB_TOKEN;

    const plan = JSON.parse(fs.readFileSync(planPath, "utf8")) as TerraformPlan;
    const { svg, count } = await planToSvg(plan, theme);
    core.info(`planar, rendered ${count} resource(s)`);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, svg);
    core.setOutput("svg-path", outputPath);
    core.setOutput("resource-count", String(count));

    const ctx = github.context;
    const defaultBranch = ctx.payload.repository?.default_branch;
    const onDefaultBranch = ctx.eventName === "push" && ctx.ref === `refs/heads/${defaultBranch}`;

    if (!onDefaultBranch) {
      core.info("planar: not a push to the default branch - wrote the SVG, skipping commit");
      return;
    }

    if (!token) {
      core.warning("planar: no token available - cannot commit the diagram");
      return;
    }

    await commitFile(token, outputPath, svg, message);
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

async function commitFile(token: string, filePath: string, content: string, message: string): Promise<void> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const branch = github.context.payload.repository?.default_branch;

  let sha: string | undefined;
  try {
    const existing = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref: branch });
    if (!Array.isArray(existing.data) && existing.data.type === "file") {
      sha = existing.data.sha;
      const current = Buffer.from(existing.data.content, "base64").toString("utf8");
      if (current === content) {
        core.info("planar: diagram unchanged - skipping commit");
        return;
      }
    }
  } catch {

  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    sha,
    branch,
  });
  core.info(`planar: committed ${filePath}`);
}

run();