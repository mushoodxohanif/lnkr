const GITHUB_API = "https://api.github.com";

export type TriggerSyncOptions = {
  limit?: number;
};

export type TriggerSyncResult = {
  runUrl: string | null;
};

export class GitHubSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubSyncError";
  }
}

export function isGitHubSyncConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_SYNC_TOKEN?.trim() && process.env.GITHUB_REPO?.trim(),
  );
}

function getGitHubSyncWorkflow(): string {
  return process.env.GITHUB_SYNC_WORKFLOW?.trim() || "sn-sync.yml";
}

function getWorkflowRef(): string {
  return (
    process.env.GITHUB_SYNC_REF?.trim() ||
    process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
    "main"
  );
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new GitHubSyncError(
      `GITHUB_REPO must be in owner/repo format (got "${repo}").`,
    );
  }
  return { owner, repo: name };
}

async function fetchLatestWorkflowRunUrl(
  token: string,
  owner: string,
  repo: string,
  workflow: string,
): Promise<string | null> {
  const runsUrl = `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=1`;

  const response = await fetch(runsUrl, {
    headers: githubHeaders(token),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    workflow_runs?: Array<{ html_url?: string }>;
  };

  return data.workflow_runs?.[0]?.html_url ?? null;
}

export async function triggerGitHubSync(
  options: TriggerSyncOptions = {},
): Promise<TriggerSyncResult> {
  const token = process.env.GITHUB_SYNC_TOKEN?.trim();
  const repoFull = process.env.GITHUB_REPO?.trim();

  if (!token || !repoFull) {
    throw new GitHubSyncError(
      "GitHub sync is not configured. Set GITHUB_SYNC_TOKEN and GITHUB_REPO.",
    );
  }

  const { owner, repo } = parseRepo(repoFull);
  const workflow = getGitHubSyncWorkflow();
  const dispatchUrl = `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;

  const body: { ref: string; inputs?: Record<string, string> } = {
    ref: getWorkflowRef(),
  };

  if (options.limit !== undefined && options.limit > 0) {
    body.inputs = { limit: String(Math.floor(options.limit)) };
  }

  const dispatchResponse = await fetch(dispatchUrl, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify(body),
  });

  if (dispatchResponse.status === 404) {
    throw new GitHubSyncError(
      `Workflow "${workflow}" not found in ${repoFull}. Check GITHUB_SYNC_WORKFLOW.`,
    );
  }

  if (dispatchResponse.status === 401 || dispatchResponse.status === 403) {
    throw new GitHubSyncError(
      "GitHub token is invalid or lacks Actions write permission.",
    );
  }

  if (!dispatchResponse.ok) {
    const text = await dispatchResponse.text();
    throw new GitHubSyncError(
      `Failed to trigger sync workflow (${dispatchResponse.status})${text ? `: ${text}` : ""}.`,
    );
  }

  const runUrl = await fetchLatestWorkflowRunUrl(token, owner, repo, workflow);

  return { runUrl };
}
