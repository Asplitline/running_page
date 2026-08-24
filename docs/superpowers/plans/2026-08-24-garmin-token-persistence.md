# Garmin CI Token Persistence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every Garmin access/refresh token rotation as SOPS+age ciphertext so scheduled GitHub Actions can synchronize indefinitely without repeated manual login.

**Architecture:** Python owns token validation, semantic hashing, explicit refresh, and atomic plaintext writes. GitHub Actions decrypts only into `$RUNNER_TEMP`, then uses a short-lived, repository-scoped GitHub App token and blob-SHA CAS to persist updated ciphertext even when business synchronization fails. Protected-branch and self-trigger guards keep automation writable without allowing ordinary users or generated commits to bypass code review.

**Tech Stack:** Python 3.12+, pytest, python-garminconnect 0.3.7, SOPS 3.13.3, age, GitHub Contents REST API, GitHub Actions.

**Design:** `docs/superpowers/specs/2026-08-24-garmin-token-persistence-design.md`

**Existing worktree note:** Preserve and incorporate the current uncommitted changes in `.github/workflows/run_data_sync.yml` and `backend/sync_garmin/auth.py`; they belong to the user. Do not discard or overwrite them wholesale.

**Commit discipline:** Before every commit below, run `git status --short`; stage only the exact files listed for that task; then run `git diff --cached --name-only` and verify no unrelated or pre-existing user file was staged. In particular, never use a broad local `git add .`.

---

## Chunk 1: Local token correctness

### Task 1: Add the Python test harness and tokenstore contract

**Files:**
- Modify: `pyproject.toml`
- Modify: `uv.lock`
- Create: `tests/backend/sync_garmin/test_tokenstore.py`
- Create: `backend/sync_garmin/tokenstore.py`

- [ ] **Step 1: Add pytest to the locked dev dependencies**

Add `pytest` to `[dependency-groups].dev`, then run:

```bash
uv lock
uv sync --frozen
```

Expected: `uv.lock` contains pytest and `uv run pytest --version` succeeds.

- [ ] **Step 2: Write failing validation and semantic-digest tests**

Cover valid JSON; missing, null, empty, and non-string required fields; malformed JSON; unreadable files; and equivalent JSON with different key order/whitespace.

```python
def test_semantic_digest_ignores_json_formatting(tmp_path):
    compact = tmp_path / "compact.json"
    pretty = tmp_path / "pretty.json"
    compact.write_text(
        '{"di_token":"a","di_refresh_token":"r","di_client_id":"c"}'
    )
    pretty.write_text(
        '{\n  "di_client_id": "c", "di_refresh_token": "r", "di_token": "a"\n}\n'
    )
    assert semantic_digest(compact) == semantic_digest(pretty)
```

- [ ] **Step 3: Run the tests and verify RED**

```bash
uv run pytest tests/backend/sync_garmin/test_tokenstore.py -v
```

Expected: FAIL because `backend.sync_garmin.tokenstore` does not exist.

- [ ] **Step 4: Implement strict parsing and canonical hashing**

Implement:

```python
REQUIRED_KEYS = ("di_token", "di_refresh_token", "di_client_id")

class TokenStoreError(RuntimeError):
    pass

def parse_token_json(raw: str) -> dict[str, str]: ...
def read_token_file(path: Path) -> dict[str, str]: ...
def canonical_token_bytes(data: Mapping[str, str]) -> bytes:
    return json.dumps(
        dict(data), sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
def semantic_digest(path: Path) -> str: ...
```

Only the three allowed fields participate. Never print their values.

- [ ] **Step 5: Run targeted tests and verify GREEN**

```bash
uv run pytest tests/backend/sync_garmin/test_tokenstore.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add pyproject.toml uv.lock backend/sync_garmin/tokenstore.py tests/backend/sync_garmin/test_tokenstore.py
git commit -m "test(garmin): define persistent tokenstore contract"
```

### Task 2: Make plaintext token writes atomic

**Files:**
- Modify: `backend/sync_garmin/tokenstore.py`
- Modify: `tests/backend/sync_garmin/test_tokenstore.py`

- [ ] **Step 1: Write failing atomic-write tests**

Test successful mode `0600`, valid replacement, and failures during write, flush/fsync, chmod, and `os.replace`. For each pre-replace failure, assert the previous valid file remains unchanged and the temporary file is cleaned up.

```python
def test_atomic_write_keeps_old_token_when_replace_fails(tmp_path, monkeypatch):
    target = tmp_path / "garmin_tokens.json"
    target.write_text(OLD_TOKEN_JSON)
    monkeypatch.setattr(os, "replace", Mock(side_effect=OSError("replace failed")))

    with pytest.raises(TokenStoreError, match="replace failed"):
        atomic_write_token(target, NEW_TOKEN_JSON)

    assert read_token_file(target)["di_refresh_token"] == "old-refresh"
```

- [ ] **Step 2: Run the atomic tests and verify RED**

```bash
uv run pytest tests/backend/sync_garmin/test_tokenstore.py -k atomic -v
```

Expected: FAIL because `atomic_write_token` is missing.

- [ ] **Step 3: Implement atomic persistence**

Use a same-directory `NamedTemporaryFile(delete=False)`, validate before writing, set mode `0600`, write, flush, `os.fsync`, and `os.replace`. `fsync` the parent directory after replacement where supported. Wrap failures in `TokenStoreError` and never truncate the target directly.

- [ ] **Step 4: Run all tokenstore tests**

```bash
uv run pytest tests/backend/sync_garmin/test_tokenstore.py -v
```

Expected: PASS with no leaked temporary files.

- [ ] **Step 5: Commit atomic persistence**

```bash
git add backend/sync_garmin/tokenstore.py tests/backend/sync_garmin/test_tokenstore.py
git commit -m "feat(garmin): persist tokenstore atomically"
```

### Task 3: Add explicit file-token authentication

**Files:**
- Modify: `backend/sync_garmin/auth.py`
- Create: `tests/backend/sync_garmin/test_auth.py`

- [ ] **Step 1: Write failing authentication tests**

Patch `backend.sync_garmin.auth.Garmin` with a fake inner client. Verify:

- `from_tokenstore()` loads the file and then clears inner `_tokenstore_path`.
- near-expiry calls `_refresh_di_token()` exactly once and atomically saves both rotated tokens.
- refresh failure raises the existing `GarminAuthError` refresh hint and leaves the file unchanged.
- `persist_tokenstore()` snapshots `inner.dumps()` through the atomic writer.
- existing `from_token()` remains compatible and retains the user's current explicit refresh/error improvement.

- [ ] **Step 2: Run the tests and verify RED**

```bash
uv run pytest tests/backend/sync_garmin/test_auth.py -v
```

Expected: FAIL because `from_tokenstore` and `persist_tokenstore` are missing.

- [ ] **Step 3: Implement the minimal wrapper**

Extend `GarminClient.__init__` with an optional `Path`. `from_tokenstore(path)` must call `inner.load(str(path))`, immediately set `inner._tokenstore_path = None`, create the wrapper, explicitly refresh if required, and call `persist_tokenstore()` before returning. Do not call `Garmin.login(tokenstore=...)` or `inner._refresh_session()`.

- [ ] **Step 4: Run authentication and tokenstore tests**

```bash
uv run pytest tests/backend/sync_garmin/test_auth.py tests/backend/sync_garmin/test_tokenstore.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit authentication changes**

```bash
git add backend/sync_garmin/auth.py tests/backend/sync_garmin/test_auth.py
git commit -m "feat(garmin): load and checkpoint file tokens"
```

### Task 4: Wire tokenstore persistence into the sync CLI

**Files:**
- Modify: `backend/sync_garmin/sync.py`
- Create: `tests/backend/sync_garmin/test_sync.py`

- [ ] **Step 1: Write failing CLI and failure-path tests**

Cover old positional secret compatibility, `--tokenstore`, mutual exclusion, neither supplied, normal final checkpoint, business failure after a simulated refresh, and simultaneous business/persistence failures.

```python
def test_business_failure_still_checkpoints_rotated_token(monkeypatch, tmp_path):
    client = FakeClient()
    monkeypatch.setattr(GarminClient, "from_tokenstore", lambda *a, **k: client)
    monkeypatch.setattr(sync, "download_new_activities", Mock(side_effect=RuntimeError("boom")))

    with pytest.raises(RuntimeError, match="boom"):
        sync.run_sync(None, tmp_path / "garmin_tokens.json", True, False)

    assert client.persist_calls == 1
```

For the double failure, require a safe `ExceptionGroup` containing both the original business exception and the token persistence exception. Assert that neither message includes token values.

```python
def test_business_and_persistence_failures_are_both_preserved(monkeypatch, tmp_path):
    client = FakeClient(persist_error=OSError("checkpoint failed"))
    monkeypatch.setattr(GarminClient, "from_tokenstore", lambda *a, **k: client)
    monkeypatch.setattr(sync, "download_new_activities", Mock(side_effect=RuntimeError("business failed")))

    with pytest.raises(ExceptionGroup) as caught:
        sync.run_sync(None, tmp_path / "garmin_tokens.json", True, False)

    assert {str(e) for e in caught.value.exceptions} == {
        "business failed", "checkpoint failed"
    }
```

- [ ] **Step 2: Run and verify RED**

```bash
uv run pytest tests/backend/sync_garmin/test_sync.py -v
```

Expected: FAIL because the CLI has no tokenstore option or final checkpoint.

- [ ] **Step 3: Implement CLI selection and `finally` persistence**

Use an argparse mutually exclusive group for positional `secret_string` and `--tokenstore`. Construct via `from_tokenstore` when supplied. Capture the business exception, attempt `persist_tokenstore()` in file mode, and raise an `ExceptionGroup("Garmin sync and token checkpoint both failed", [business_error, persistence_error])` if both fail. If only one fails, re-raise that one with its traceback. Never include token values in either diagnostic.

- [ ] **Step 4: Run backend tests and lint**

```bash
uv run pytest tests/backend/sync_garmin -v
uv run ruff check backend/sync_garmin tests/backend/sync_garmin
uv run black --check backend/sync_garmin tests/backend/sync_garmin
```

Expected: all pass.

- [ ] **Step 5: Commit sync integration**

```bash
git add backend/sync_garmin/sync.py tests/backend/sync_garmin/test_sync.py
git commit -m "feat(garmin): checkpoint tokens on sync exit"
```

## Chunk 2: Remote encrypted state transaction

### Task 5: Add a tested GitHub Contents CAS client

**Files:**
- Create: `backend/sync_garmin/github_state.py`
- Create: `tests/backend/sync_garmin/test_github_state.py`

- [ ] **Step 1: Write failing API tests**

Mock `urllib.request.urlopen` and cover:

- GET 200 decodes base64 content and returns blob SHA.
- GET 404 returns an explicit bootstrap result.
- PUT includes `branch=master`, `[skip ci]`, encrypted base64 content, and the expected SHA when present.
- PUT 401 raises a distinct `GitHubStateAuthError`, writes safe output `failure_kind=auth`, and exits CLI code 75 so the workflow can reissue an App token once.
- PUT 409/422 raises `GitHubStateConflictError` and is never retried.
- no response or exception includes token/ciphertext contents.

- [ ] **Step 2: Run and verify RED**

```bash
uv run pytest tests/backend/sync_garmin/test_github_state.py -v
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the API and CLI**

Provide `fetch` and `put` subcommands. Read authentication only from `GH_TOKEN`; write ciphertext and metadata to explicit files under `$RUNNER_TEMP`; emit only safe metadata to stdout and `$GITHUB_OUTPUT`. Use an overridable API base URL for tests. CLI exit codes are: `0` success/no-op, `75` authentication retry allowed, `76` CAS conflict, and `1` all other failures. Before any nonzero exit, write `failure_kind=auth|conflict|other`; never write secrets or ciphertext.

```bash
uv run python -m backend.sync_garmin.github_state fetch \
  --repository "$GITHUB_REPOSITORY" --ref master \
  --remote-path .github/state/garmin-cn-token.sops.json \
  --output "$RUNNER_TEMP/garmin-token.sops.json" \
  --metadata "$RUNNER_TEMP/garmin-token-state.json"
```

- [ ] **Step 4: Run tests and quality checks**

```bash
uv run pytest tests/backend/sync_garmin/test_github_state.py -v
uv run ruff check backend/sync_garmin/github_state.py tests/backend/sync_garmin/test_github_state.py
uv run black --check backend/sync_garmin/github_state.py tests/backend/sync_garmin/test_github_state.py
```

Expected: PASS.

- [ ] **Step 5: Commit the CAS client**

```bash
git add backend/sync_garmin/github_state.py tests/backend/sync_garmin/test_github_state.py
git commit -m "feat(ci): add encrypted token state CAS client"
```

### Task 6: Implement SOPS preparation and persistence in the workflow

**Files:**
- Modify: `.github/workflows/run_data_sync.yml`
- Create: `tests/workflows/test_run_data_sync_workflow.py`
- Modify: `.gitignore`
- Create after receiving the public recipient: `.sops.yaml`

- [ ] **Step 1: Write failing static workflow tests**

Parse YAML with PyYAML and assert:

- workflow/job concurrency uses `cancel-in-progress: false`.
- sync job uses `environment: garmin-sync`.
- push paths include `backend/**/*.py`, `pyproject.toml`, `uv.lock`, and exclude generated files.
- job rejects `vars.RUNNING_PAGE_APP_BOT_ACTOR`.
- job `permissions.contents` is `read` and checkout has `persist-credentials: false`, `ref: master`.
- SOPS is 3.13.3 with SHA-256 `e5bec3346a873ae91d871550f3e698c1aad962aff462a080e40f25fde17fef6b`.
- `actions/create-github-app-token` is pinned to `fee1f7d63c2ff003460e3d139729b119787bc349` and generated after sync with `always()`.
- state persistence uses the explicit first-attempt/re-sign/retry/final-gate graph below, and final data push uses a separately generated App token.
- dry-run skips only the generated-data commit/push.
- generated-data staging uses `GPX_OUT/**`, `backend/data.db`, `imported.json`, `frontend/src/static/activities.json`, and optional `frontend/src/static/daily_metrics.json`; it never uses `git add .` and does not include `assets`.
- `SAVE_DATA_IN_GITHUB_CACHE=true` retains the existing skip-commit/push behavior.
- a no-change run emits `data_commit_created=false` and skips the data App token/push.
- state/data commit messages include `[skip ci]`.
- the data push helper retries exactly one non-fast-forward race and never retries authentication, authorization, network, or rebase-conflict errors.

- [ ] **Step 2: Run and verify RED**

```bash
uv run pytest tests/workflows/test_run_data_sync_workflow.py -v
```

Expected: FAIL against the current workflow.

- [ ] **Step 3: Pause for the age public recipient**

Ask the user to configure the GitHub App and `garmin-sync` Environment, and to provide only the non-secret age public recipient (`age1...`). Never ask for or accept the age private key/App private key in chat. Do not create or commit `.sops.yaml` until the public recipient is confirmed.

- [ ] **Step 4: Add SOPS configuration after confirmation**

Create:

```yaml
creation_rules:
  - path_regex: ^\.github/state/garmin-cn-token\.sops\.json$
    age: AGE_PUBLIC_RECIPIENT_FROM_SETUP
```

Never place the age private key in this file or git history.

- [ ] **Step 5: Rewrite the workflow in small, named steps**

Pin existing Actions to their resolved full SHAs while preserving their current behavior:

- `actions/checkout`: `11d5960a326750d5838078e36cf38b85af677262`
- `astral-sh/setup-uv`: `d0cc045d04ccac9d8b7881df0226f9e82c39688e`
- `actions/cache`: `0057852bfaa89a56745cba8c7296529d2fc39830`
- `actions/create-github-app-token`: `fee1f7d63c2ff003460e3d139729b119787bc349`

Set `environment: garmin-sync`. Install SOPS 3.13.3 from its official release and verify the exact checksum before `chmod`/installation. Fetch encrypted state with the read-only job token, decrypt or bootstrap in `$RUNNER_TEMP`, record semantic digest, and run sync with `--tokenstore`.

Implement this exact state step graph after sync:

1. `create-state-app-token` uses `if: ${{ always() }}`.
2. `prepare-state-ciphertext` uses `if: ${{ always() }}` and performs validation, semantic-change/bootstrap decision, SOPS encryption, MAC/round-trip verification, and writes one immutable ciphertext file plus the original blob SHA. It does not call PUT.
3. `persist-state-first` uses `if: ${{ always() }}` and `continue-on-error: true`; it calls only `github_state put` with that ciphertext/SHA and publishes `failure_kind`.
4. `reissue-state-app-token` runs only when the first outcome is failure and `failure_kind == 'auth'`.
5. `persist-state-retry` runs only after reissue succeeds, reusing the exact same ciphertext bytes and blob SHA. It also uses `continue-on-error: true` so the gate always runs.
6. `state-persistence-gate` uses `if: ${{ always() }}` and succeeds only when the first PUT succeeded/no-op, or the first failure was auth and the retry succeeded. First-round conflict/other failure, reissue failure, and retry failure all exit nonzero. The pre-existing sync step failure remains a job failure even if this gate succeeds.

Because the gate restores every swallowed failure, subsequent data push steps use `if: ${{ success() && steps.data_commit.outputs.created == 'true' }}` and Pages cannot run after a sync/state failure.

For generated data, only run when `SAVE_DATA_IN_GITHUB_CACHE != true` and `dry_run != true`. Stage explicitly:

```bash
git add -A -- GPX_OUT backend/data.db imported.json frontend/src/static/activities.json
if [[ -e frontend/src/static/daily_metrics.json ]] || git ls-files --error-unmatch frontend/src/static/daily_metrics.json >/dev/null 2>&1; then
  git add -A -- frontend/src/static/daily_metrics.json
fi
```

Fail if any unstaged/untracked path remains or if staged paths escape the allowlist. If `git diff --cached --quiet`, write `created=false` and exit successfully; otherwise commit with `[skip ci]` and write `created=true`.

Immediately before data push, issue a separate App token. Execute `git fetch origin master`, `git rebase origin/master`, then push. If and only if push stderr identifies a non-fast-forward/fetch-first rejection caused by a concurrent remote advance, fetch and rebase again and retry one time. A rebase conflict, 401/403, network error, or second rejection fails immediately; no `|| echo` is allowed.

- [ ] **Step 6: Add plaintext defenses**

Add only generic local tokenstore paths to `.gitignore`—never ignore the intended SOPS ciphertext. Before every commit, fail if `git status --porcelain` contains a path outside the explicit generated allowlist.

- [ ] **Step 7: Run static workflow tests and YAML validation**

```bash
uv run pytest tests/workflows/test_run_data_sync_workflow.py -v
uv run python - <<'PY'
from pathlib import Path
import yaml
yaml.safe_load(Path('.github/workflows/run_data_sync.yml').read_text())
print('workflow yaml: ok')
PY
```

Expected: PASS and `workflow yaml: ok`.

- [ ] **Step 8: Commit workflow implementation**

```bash
git add .github/workflows/run_data_sync.yml .gitignore .sops.yaml tests/workflows/test_run_data_sync_workflow.py
git commit -m "feat(ci): persist Garmin tokens with SOPS"
```

### Task 7: Document and perform the external GitHub setup

**Files:**
- Modify: `README.md`
- Modify: `README-CN.md`
- Modify: `.env.example`

- [ ] **Step 1: Document exact setup requirements**

Document:

- create an age key pair locally; commit only its public recipient in `.sops.yaml`.
- create Environment `garmin-sync`, restricted to protected `master`.
- add Environment Secrets `SOPS_AGE_KEY`, `RUNNING_PAGE_APP_ID`, `RUNNING_PAGE_APP_PRIVATE_KEY`, and bootstrap `GARMIN_SECRET_STRING_CN`.
- create/install a GitHub App only on this repository with Metadata read and Contents read/write.
- enable required PR/CODEOWNERS rules and list only that App as bypass actor.
- set repository variable `RUNNING_PAGE_APP_BOT_ACTOR=<app-slug>[bot]`.
- after two successful encrypted-state runs, delete bootstrap `GARMIN_SECRET_STRING_CN`.
- never restore historical ciphertext; revoke Garmin sessions before rotating a leaked age key.

- [ ] **Step 2: Commit documentation**

```bash
git add README.md README-CN.md .env.example
git commit -m "docs(ci): explain Garmin token persistence setup"
```

- [ ] **Step 3: Verify external state without reading secret values**

Do not create the GitHub App, ruleset bypass, Environment, or Secrets without explicit user confirmation. Confirm only that the named Environment Secrets and repository variable exist; never read or request their values.

## Chunk 3: Verification and rollout

### Task 8: Verify locally and perform a safe bootstrap run

**Files:**
- Modify only if tests expose defects in files already listed above.

- [ ] **Step 1: Run the complete local verification suite**

```bash
uv sync --frozen
uv run pytest tests/backend/sync_garmin tests/workflows -v
uv run ruff check .
uv run black . --check
pnpm run check
pnpm exec eslint src --ext .ts,.tsx
pnpm --filter @running-page/frontend lint
pnpm run build
git diff --check
```

Expected: all commands pass.

- [ ] **Step 2: Scan for plaintext token material**

```bash
git status --short
git diff --cached --name-only
git grep -n 'di_refresh_token' -- ':!docs/**' ':!tests/**'
```

Expected: only code/schema references; no real token values or plaintext tokenstore files.

- [ ] **Step 3: Push the implementation branch only after user approval**

Do not push automatically. Confirm the GitHub App, Environment secrets, repository variable, `.sops.yaml` recipient, and ruleset bypass are configured first.

- [ ] **Step 4: Trigger workflow dispatch with `dry_run=true`**

Expected:

- sync may authenticate and refresh;
- no activity-data commit is pushed;
- bootstrap ciphertext is created or rotated through CAS;
- no second effective sync is triggered by the App commit;
- logs contain no token value.

- [ ] **Step 5: Trigger a second dry run**

Expected: it decrypts the newly persisted state. If the semantic token values do not change, no state commit is created.

- [ ] **Step 6: Trigger a normal run and verify deployment**

Expected: generated data rebases over the state commit, pushes once, does not self-trigger, and Pages publishes only after sync/state persistence succeed.

- [ ] **Step 7: Final commit if rollout fixes were needed**

```bash
git add <only-files-fixed-during-rollout>
git commit -m "fix(ci): harden Garmin token rollout"
```
