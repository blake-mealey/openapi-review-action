import {
  OpenApiReview,
  IGitClient,
  IIoManager,
  IContext,
} from "openapi-review-lib";
import { getOctokit, context } from "@actions/github";
import { getInput, setFailed } from "@actions/core";
import { GitHub } from "@actions/github/lib/utils";

class GitClient implements IGitClient {
  private octoKit: InstanceType<typeof GitHub>;

  constructor(ioManager: IIoManager) {
    this.octoKit = getOctokit(
      ioManager.getInput("github-token", { required: true })
    );
  }

  async getPullRequestDiff({ owner, repo, pullRequestId }): Promise<string> {
    const result = (
      await this.octoKit.pulls.get({
        owner,
        repo,
        pull_number: pullRequestId,
        mediaType: { format: "diff" },
      })
    ).data;
    return (result as unknown) as string;
  }

  async getFileContent({ path, owner, repo, ref }): Promise<string> {
    const result = (
      await this.octoKit.repos.getContent({
        owner,
        repo,
        ref,
        path,
        mediaType: { format: "raw" },
      })
    ).data;
    return (result as unknown) as string;
  }

  async createPullRequestComment({
    owner,
    repo,
    pullRequestId,
    comment,
  }): Promise<void> {
    await this.octoKit.issues.createComment({
      owner,
      repo,
      issue_number: pullRequestId,
      body: comment,
    });
  }
}

class IoManager implements IIoManager {
  getInput(key: string, options?: { required?: boolean; default?: any }) {
    let value = getInput(key, {
      required: options.required,
    });
    if (
      (value === undefined || value === null || value === "") &&
      options.default !== undefined
    ) {
      value = options.default;
    }
    return value;
  }

  setFailed(error: Error): void {
    setFailed(error);
  }
}

function createContext(): IContext {
  const pullRequest = context.payload.pull_request;
  return {
    pullRequest: {
      id: pullRequest.number.toString(),
      base: {
        ref: pullRequest.base.ref,
        repoOwner: pullRequest.base.repo.owner.login,
        repoName: pullRequest.base.repo.name,
      },
      head: {
        ref: pullRequest.head.ref,
        repoOwner: pullRequest.head.repo.owner.login,
        repoName: pullRequest.head.repo.name,
      },
    },
  };
}

async function main() {
  const ioManager = new IoManager();
  const gitClient = new GitClient(ioManager);
  const context = createContext();

  await new OpenApiReview(gitClient, ioManager, context).run();
}

main();
