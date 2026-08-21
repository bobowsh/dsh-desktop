# dsh-ci - Continuous Integration (CI) plugin for DeepSeek Harness (DSH)

`dsh-ci` is a generic, provider-neutral CI/CD plugin for DeepSeek Harness (DSH). It enables agents to inspect CI runs, extract bounded failure evidence, locate source errors, and safely rerun or cancel pipelines.

The current version supports **GitHub Actions** as the primary CI provider. Its architecture is explicitly designed to be provider-neutral, allowing future implementations for GitLab CI, Jenkins, CircleCI, etc. without modifying the generic CI tool layer.

## Architecture

```text
DSH Agent
   ↓
Generic CI Tools (ci_status, ci_failure, etc.)
   ↓
ctx.ci (CIService Context interface)
   ↓
GitHubActionsProvider (implements CIService)
   ↓
GitHub Actions REST API
```

## Key Features

- **Generic CI Tools**: A stable set of 9 tools exposed to the agent loop.
- **Ecosystem-neutral Service Layer**: Abstract `CIService` and `AbstractCIProvider` core contracts.
- **Automatic Workspace Detection**: Parses local git repository (origins, remotes, branches, HEAD) to automatically map owner and repository without user input.
- **Failure evidence extraction**: Bounded logs (default 8KB), error-focused extraction (only lines around errors), and de-duplication.
- **Failure Parser Registry**: Specialized regex parser patterns to map compile errors, test suite failures, docker fails, and generic exit codes to exact source files, lines, and functions. Supports:
  - TypeScript compilation errors (`tsc`)
  - Jest / Vitest test runner failures
  - pytest (Python) failures
  - Maven / Gradle (Java) build failures
  - Go test failures
  - Cargo (Rust) compile errors
  - ESLint errors
  - Docker build errors
  - npm install/dependency errors
  - Generic command exit codes
- **Secret Redaction**: Automatic scrubbing of sensitive tokens, private keys, passwords, and AWS keys from all log output returned to the LLM.
- **Write Approval Gates**: Write operations (`ci_rerun`, `ci_cancel`) are approval-gated and disabled by default (`writeEnabled: false`). Cancel operation always requires approval.

---

## Installation

Add this plugin directly via DeepSeek Harness CLI:

```bash
dsh plugin add dsh-ci
```

---

## Configuration

Add the following block to your `settings.json` or `settings.local.json` configuration file:

```json
{
  "plugins": {
    "dsh-ci": {
      "writeEnabled": false,
      "maxLogSize": 8192,
      "maxEvidenceItems": 50,
      "apiBase": "https://api.github.com"
    }
  }
}
```

### Credentials

The plugin integrates with the standard DSH credential manager. It will automatically check for credentials in the following order:

1. `GH_TOKEN` environment variable
2. `GITHUB_TOKEN` environment variable
3. Local `gh` auth credentials (via GitHub CLI helper)

---

## Tool Reference

The plugin registers 9 provider-neutral tools inside DSH:

### `ci_status`

Gets the overall CI status of the repository, current branch, or commit.
- **Parameters**: `repository?`, `branch?`, `commit?`

### `ci_runs`

Lists recent workflow runs in the repository.
- **Parameters**: `repository?`, `branch?`, `status?`, `limit?`

### `ci_run`

Retrieves a detailed description of a single run.
- **Parameters**: `runId` (required), `repository?`

### `ci_jobs`

Lists all jobs and their execution steps inside a workflow run.
- **Parameters**: `runId` (required), `repository?`

### `ci_failure`

Looks up a failed run, identifies the failing jobs/steps, parses their logs, and compiles a structured failure evidence block containing exact file paths, line numbers, test names, and a bounded log excerpt.
- **Parameters**: `runId` (required), `jobId?`, `repository?`, `maxExcerpts?`

### `ci_log`

Fetches log excerpts for a given job or step. Excerpts are bounded in size and redact all secrets automatically.
- **Parameters**: `jobId` (required), `stepId?`, `repository?`, `maxBytes?`

### `ci_artifacts`

Lists metadata about build artifacts.
- **Parameters**: `runId` (required), `repository?`

### `ci_rerun`

Triggers a rerun of a workflow run. Requires write authorization.
- **Parameters**: `runId` (required), `dryRun?`, `repository?`

### `ci_cancel`

Cancels an in-progress workflow run. Always requires approval.
- **Parameters**: `runId` (required), `repository?`

---

## Security Model

1. **Untrusted Input**: All log outputs are treated as untrusted data. We filter and redact strings matching high-risk signatures (e.g., token prefixes, private keys) to prevent prompt injection and credential leaking.
2. **Context Preservation**: Full logs are never returned to the model. We slice logs to focus on errors, avoiding context window explosion.
3. **Approval Flow**: Triggering runs or cancels will prompt the user with DSH Approval seam for explicit consent before issuing the REST requests.

---

## License

MIT License.
