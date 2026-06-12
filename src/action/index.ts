import * as fs from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { planToSvg, type RenderResult } from "../core/pipeline.js";
import { svgToPng } from "../core/rasterize.js";
import type { TerraformPlan } from "../core/plan.js";
import type { ThemeName } from "../core/theme.js";

const MARKER = "<!-- planar-bot -->";
const IMAGE_BRANCH = "planar-bot";

type Octokit = ReturnType<typeof github.getOctokit>;

async function run(): Promise<void> {
  try {
    const planPath = core.getInput("plan", { required: true });
    const outputPath = core.getInput("output") || ".planar/diagram.svg";
    const theme: ThemeName = core.getInput("theme") === "dark" ? "dark" : "light";
    const message = core.getInput("commit-message") || "chore: update Planar diagram";
    const token = core.getInput("token") || process.env.GITHUB_TOKEN;

    const plan = JSON.parse(fs.readFileSync(planPath, "utf8")) as TerraformPlan;
    const result = await planToSvg(plan, theme);
    core.info(`planar: rendered ${result.count} resource(s)`);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result.svg);
    core.setOutput("svg-path", outputPath);
    core.setOutput("resource-count", String(result.count));

    if (!token) {
      core.warning("planar: no token available — wrote the SVG, skipping repo updates");
      return;
    }

    const ctx = github.context;
    if (ctx.eventName === "pull_request") {
      await commentOnPullRequest(github.getOctokit(token), result);
    } else if (isPushToDefaultBranch(ctx)) {
      await commitFile(github.getOctokit(token), outputPath, result.svg, message);
    } else {
      core.info("planar: not a pull request or default-branch push — wrote the SVG, nothing else to do");
    }
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

function isPushToDefaultBranch(ctx: typeof github.context): boolean {
  const defaultBranch = ctx.payload.repository?.default_branch;
  return ctx.eventName === "push" && ctx.ref === `refs/heads/${defaultBranch}`;
}

/** Build the human-readable diff line for a PR comment. */
function summary(result: RenderResult): string {
  const { create, update, replace, delete: del } = result.counts;
  const parts: string[] = [];
  if (create) parts.push(`🟢 ${create} to create`);
  if (update + replace) parts.push(`🟠 ${update + replace} to change`);
  if (del) parts.push(`🔴 ${del} to destroy`);
  return parts.length ? parts.join(" · ") : "No resource changes.";
}

/** Rasterize the diagram, host it on a side branch, and post/update one sticky comment. */
async function commentOnPullRequest(octokit: Octokit, result: RenderResult): Promise<void> {
  const ctx = github.context;
  const prNumber = ctx.payload.pull_request?.number;
  if (!prNumber) {
    core.warning("planar: no pull request number in context — skipping comment");
    return;
  }
  const { owner, repo } = ctx.repo;

  const png = await svgToPng(result.svg);
  const imagePath = `diagrams/pr-${prNumber}.png`;
  const blobSha = await hostImage(octokit, owner, repo, imagePath, png, prNumber);

  // Cache-bust the camo proxy with the new blob sha so updates show immediately.
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${IMAGE_BRANCH}/${imagePath}?v=${blobSha.slice(0, 8)}`;
  const body = `${MARKER}\n## Planar\n\n${summary(result)}\n\n![Planar diagram](${rawUrl})\n`;

  const { data: comments } = await octokit.rest.issues.listComments({ owner, repo, issue_number: prNumber });
  const existing = comments.find((c) => c.body?.includes(MARKER));
  if (existing) {
    await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    core.info(`planar: updated comment on PR #${prNumber}`);
  } else {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
    core.info(`planar: commented on PR #${prNumber}`);
  }
}

/** Push the PNG to the image branch (creating the branch on first use); return its blob sha. */
async function hostImage(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  png: Buffer,
  prNumber: number,
): Promise<string> {
  await ensureBranch(octokit, owner, repo, IMAGE_BRANCH);

  let sha: string | undefined;
  try {
    const existing = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref: IMAGE_BRANCH });
    if (!Array.isArray(existing.data) && existing.data.type === "file") sha = existing.data.sha;
  } catch {
    // Image doesn't exist on the branch yet.
  }

  const res = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    branch: IMAGE_BRANCH,
    message: `chore: planar diagram for PR #${prNumber}`,
    content: png.toString("base64"),
    sha,
  });
  return res.data.content?.sha ?? "";
}

/** Create the image branch off the default branch if it doesn't already exist. */
async function ensureBranch(octokit: Octokit, owner: string, repo: string, branch: string): Promise<void> {
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    return;
  } catch {
    // Branch is missing — create it below.
  }
  const base = github.context.payload.repository?.default_branch;
  const baseRef = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${base}` });
  await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseRef.data.object.sha });
  core.info(`planar: created ${branch} branch for diagram hosting`);
}

/** Create or update the diagram on the default branch via the contents API; skip if unchanged. */
async function commitFile(octokit: Octokit, filePath: string, content: string, message: string): Promise<void> {
  const { owner, repo } = github.context.repo;
  const branch = github.context.payload.repository?.default_branch;

  let sha: string | undefined;
  try {
    const existing = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref: branch });
    if (!Array.isArray(existing.data) && existing.data.type === "file") {
      sha = existing.data.sha;
      const current = Buffer.from(existing.data.content, "base64").toString("utf8");
      if (current === content) {
        core.info("planar: diagram unchanged — skipping commit");
        return;
      }
    }
  } catch {
    // 404: the file doesn't exist yet, so we create it below.
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