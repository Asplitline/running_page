# Garmin CI Token 持久化设计

## 背景

当前数据同步从 GitHub Secret `GARMIN_SECRET_STRING_CN` 读取一段 token JSON，并通过 `client.loads()` 放入内存。access token 到期时，`python-garminconnect` 会使用 refresh token 换取新 token，但因为没有文件型 tokenstore，刷新结果不会写回持久存储。CI 进程结束后，新 access token 以及可能轮换的 refresh token 都会丢失。

目标是让每日同步长期自动续期，同时不把 Garmin 明文凭据、明文 token 或高权限 GitHub PAT 放入仓库。

## 决策

使用 SOPS + age 保存加密后的 Garmin tokenstore：

- 仓库只提交 SOPS 加密文件 `.github/state/garmin-cn-token.sops.json`。
- age 私钥保存在 `garmin-sync` Environment Secret `SOPS_AGE_KEY`。
- CI 将密文解密到 runner 临时目录中的 `garmin_tokens.json`。
- 同步代码使用底层文件加载能力，但由本项目负责显式刷新和原子写回；不依赖库中会吞异常的自动写盘逻辑。
- 同步结束或失败后，CI 都执行完整的 token 状态事务；首次 bootstrap 或 token 变化时重新加密，并通过带 blob SHA 的 GitHub Contents API 条件更新密文。
- 现有 `GARMIN_SECRET_STRING_CN` 只用于首次迁移。密文状态文件存在后，不再读取旧 Secret。

不使用 Actions cache 保存 token。GitHub 明确说明 cache 可能被低信任工作流读取，不应存放 Secret 或其他敏感数据。也不让 CI 更新 GitHub Secret，因为那需要 Actions Secrets 管理权限。自动提交使用一个只安装到当前仓库、仅有 Contents 读写权限的 GitHub App 短期 token；不使用 PAT，也不给该 App 管理 Secrets 的权限。

## 组件边界

### Token 状态模块

在 `backend/sync_garmin/` 中新增一个小型 tokenstore 辅助模块，职责仅包括：

- 验证 tokenstore 文件存在，且 `di_token`、`di_refresh_token`、`di_client_id` 均为非空字符串。
- 对验证后的 token 对象做规范化 JSON 序列化，再计算 SHA-256 语义摘要，用于判断刷新前后是否变化。
- 将 `client.dumps()` 写入同目录临时文件，执行 `chmod(0600)`、flush、`fsync`，最后用 `os.replace` 原子替换正式文件。
- 为 CLI 提供清晰、可测试的输入错误。

加密和解密由 SOPS CLI 完成，不在 Python 中自行实现密码算法。

规范化序列化固定为完整允许字段集、`sort_keys=True`、`separators=(",", ":")`、`ensure_ascii=False`。同步前后以及 SOPS round-trip 都只比较该语义摘要；原始文件字节摘要仅用于诊断，不参与变更判断，避免 JSON 键顺序、缩进和尾换行产生无意义提交。

### Garmin 认证封装

`GarminClient` 增加文件 tokenstore 构造入口：

- 使用底层 `inner.load()` 读取文件，然后清除库内部 `_tokenstore_path`，禁止其非原子、吞异常的自动写盘路径。
- access token 临近过期时直接调用 `_refresh_di_token()`，使 refresh 失败在认证边界直接暴露。
- 刷新成功后立即通过本项目的原子写入函数保存最新 access/refresh token；写盘失败必须使任务失败。
- 顶层同步在 `finally` 中再次保存 `client.dumps()` 快照，覆盖业务请求收到 401 后由库触发的内存二次刷新。
- 保留现有字符串 token 入口，作为本地兼容和首次迁移路径，但 CI 日常同步不再使用它。

正常的到期刷新在任何业务 API 请求前完成并落盘，将“token 已轮换但 runner 尚未保存”的窗口降到最小。对于请求中的意外 401，顶层 `finally` 提供第二层保存保障；runner 被强制终止仍属于无法完全消除的外部风险。

### 同步 CLI

`backend.sync_garmin.sync` 增加 `--tokenstore <目录>` 参数：

- `--tokenstore` 与旧位置参数 `secret_string` 互斥。
- CI 使用 `--tokenstore`。
- 本地原有命令继续可用，避免破坏现有使用方式。
- 无论活动同步成功还是失败，`finally` 都尝试原子保存当前内存 token；保存失败不能被原始业务异常掩盖，并在日志中同时保留两者的诊断信息。

### GitHub Actions

`run_data_sync.yml` 增加以下步骤：

1. job 取得 concurrency 锁后，显式 checkout 最新 `master`，而不是事件创建时的旧 SHA。
2. 安装固定版本并校验 checksum 的 SOPS。
3. 创建仅 runner 当前用户可访问的临时 tokenstore 目录。
4. 使用官方 `actions/create-github-app-token`（固定完整 SHA）取得单仓库、短期 App token，并从 GitHub Contents API 读取当前密文及其 blob SHA。如果密文存在，使用 `SOPS_AGE_KEY` 解密；否则从 `GARMIN_SECRET_STRING_CN` 创建首次 tokenstore。
5. 验证 tokenstore，记录同步前明文摘要，并执行 Garmin 同步。
6. 同步成功时先在本地创建“活动数据”提交，但暂不 push；`dry_run` 跳过该提交。
7. 使用单个 `if: ${{ always() }}` 步骤完成 token 状态事务：验证明文、判断 `ciphertext_missing || semantic_digest_changed`、使用 `--filename-override .github/state/garmin-cn-token.sops.json` 加密、反向解密并校验语义摘要和 SOPS MAC，然后使用 App token 通过 Contents API 带原 blob SHA 更新远端文件。
8. 同步成功且非 `dry_run` 时，fetch 最新 master，将本地活动数据提交 rebase 到刚产生的 token 状态提交之上，再使用 App token push。
9. 只有同步和 token 持久化都成功时才发布 Pages。

工作流增加固定 concurrency group，且不取消正在运行的任务，防止两个任务同时消费并轮换同一个 refresh token。Contents API 更新使用原密文 blob SHA 作为 CAS：无关远端提交不阻塞更新；密文本身被其他写入者修改时返回冲突，当前任务不得覆盖，并明确报警。所有 token 验证、加密、round-trip 校验和 CAS 上传必须位于同一个 `always()` 状态事务中，避免同步失败后某个默认 `success()` 步骤被跳过。

`dry_run` 只跳过活动数据 commit/push；认证可能轮换 token，因此 token 状态事务仍必须执行。

## 数据流

```text
SOPS 密文 + SOPS_AGE_KEY
          |
          v
runner 临时 garmin_tokens.json
          |
          v
GarminClient.from_tokenstore()
          |
          +-- access token 有效 --> 正常调用
          |
          `-- 即将过期 --> 显式 refresh --> 原子写回临时 tokenstore
                                      |
                                      v
                  SOPS round-trip 校验 + Contents API CAS 更新
```

首次迁移时，输入来自旧 `GARMIN_SECRET_STRING_CN`；成功创建密文后，后续运行只走密文路径。

## 失败处理

- 任意路径缺少 `SOPS_AGE_KEY`：在解密或 bootstrap round-trip 前失败，并给出配置指引，不回退到不校验的流程。
- 首次 bootstrap：即使 token 没有刷新，也必须生成、round-trip 校验并上传第一份密文。旧 Secret 缺失、空值、非法 JSON 或字段为 null/空串/非字符串时立即失败。
- 密文无法解密或 tokenstore 结构不完整：同步停止，不覆盖仓库中的已知密文。
- refresh token 被 Garmin 拒绝：输出明确的重新登录指引；旧 tokenstore 保持完整，不写空文件。
- refresh 已成功、活动下载随后失败：Python `finally` 先原子保存，Actions 的单步 `always()` 状态事务再加密并 CAS 上传；原同步步骤仍保持失败状态。
- SOPS 加密、MAC 或 round-trip 校验失败：不上传密文，任务失败。
- token 状态 CAS 冲突：绝不覆盖远端较新状态，任务失败并报警。无关 master push 由 Contents API 自动基于最新分支创建提交，不造成冲突。
- 活动数据 push 冲突：rebase 最新 master 后重试一次；仍失败则明确报错，不用 `|| echo` 吞掉失败。
- 日志只输出状态、字段名和摘要，不输出明文 token、密文解密内容或 age 私钥。

## 安全约束

- 明文 tokenstore 只能位于 `$RUNNER_TEMP` 下，目录权限 `0700`、文件权限 `0600`。
- 明文路径加入 `.gitignore` 的防御性规则；工作流提交时显式指定密文文件，不使用 `git add .` 处理 token 状态。
- SOPS 固定版本并校验官方 checksum；所有 Actions 固定完整 commit SHA，避免可移动 tag 带来的供应链风险。
- 新生成或转换的敏感值立即加入 Actions mask。
- job 自带的 `GITHUB_TOKEN` 只声明 `contents: read`。checkout 不持久化凭据；只有 token 状态 CAS 和最终数据 push 步骤接收 GitHub App 的短期 token。
- GitHub App 只安装到该仓库，仅授予 Contents 读写和必需的 Metadata 读取权限；不授予 Actions、Secrets、Administration 等权限。App ID、私钥和 `SOPS_AGE_KEY` 放入只允许受保护 master 使用的 `garmin-sync` Environment。
- master 开启 required PR review 和 CODEOWNERS；workflow、`backend/sync_garmin/`、`.sops.yaml` 和依赖锁文件必须经过审查。ruleset 只把该 GitHub App 列为 bypass actor，使自动 token/data 提交可直写，普通用户和普通 `GITHUB_TOKEN` 不能绕过。
- App 的 Contents 写权限技术上可以修改仓库任意文件，因此恶意代码一旦通过审查进入受信任 master，仍可读取明文 Garmin token并利用 App 写仓库；这是该方案明确的信任边界。Environment 限制、CODEOWNERS、完整 SHA 固定和最小 App 权限共同缩小风险，但日志 mask 不能替代代码审查。

## 测试策略

新增 Python 测试覆盖：

- wrapper 持有可回写路径，但底层库的 `_tokenstore_path` 被清除。
- access token 临近过期时刷新且写回新 access/refresh token。
- refresh 失败时抛出 `GarminAuthError`，不破坏旧文件。
- 原子写入在 write、flush、fsync、chmod 或 replace 失败时保留旧文件并明确报错。
- `--tokenstore` 与旧字符串参数的互斥和兼容行为。
- tokenstore 缺字段、非 JSON、字段为 null/空串/非字符串、权限异常时给出明确错误。
- refresh 成功后业务调用异常时，`finally` 仍保存最新 token。

工作流验证覆盖：

- 首次 bootstrap 能生成 SOPS 密文且仓库中没有明文 token。
- 正常刷新后密文发生变化，下一次运行能从新密文继续同步。
- 首次 bootstrap 未发生刷新时仍创建密文。
- 模拟刷新后业务失败，完整 `always()` 状态事务仍执行并远端更新成功，最终 job 保持失败。
- token 未变化时不产生无意义提交。
- 不同 JSON 键顺序、缩进或尾换行但 token 值相同时，语义摘要一致且不产生提交；SOPS round-trip 也按语义摘要校验。
- `dry_run` 不提交活动数据，但仍持久化轮换后的 token。
- 排队任务从最新 master 读取状态，不使用事件旧 SHA。
- 无关 push 不阻塞 Contents API 更新；state blob CAS 冲突不会覆盖远端。
- 在实际启用 required PR/CODEOWNERS 的 ruleset 下，普通 `GITHUB_TOKEN` 无法直推，而被列为 bypass actor 的最小权限 GitHub App 能完成 state PUT 和数据 push。
- SOPS filename rule、加密/解密 round-trip、MAC、错误或缺失 age key均被验证。
- 自动扫描 git diff、index 和提交内容，确保明文 tokenstore 从未进入仓库。

## 迁移与回滚

迁移步骤：

1. 本地生成 age key pair。
2. 将私钥存入 `garmin-sync` Environment Secret `SOPS_AGE_KEY`，公钥写入 `.sops.yaml`。
3. 创建只安装到本仓库且只有 Contents 读写权限的 GitHub App，把 App 加入 master ruleset bypass，并将 App ID/私钥存入 `garmin-sync` Environment。
4. 保留现有 `GARMIN_SECRET_STRING_CN`，首次 CI 使用它生成并 CAS 上传密文状态。
5. 验证连续两次同步成功后，删除旧 `GARMIN_SECRET_STRING_CN`。

token 状态是单调前进的，禁止通过 Git revert 或历史密文回退 token。回滚实现时必须先停用同步并发，从远端最新 SOPS 密文解出当前 token，再将该当前值交给旧 CLI；已轮换的旧 Secret 不能作为可靠回滚来源。

若 age 私钥疑似泄漏，git 历史里的全部旧密文都应视为可解密。必须先在 Garmin 服务端撤销相关会话/token（必要时修改密码），然后重新登录生成 token、生成新的 age key，并用新 key 加密最新状态。
