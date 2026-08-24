# Garmin CI Token 持久化设计

## 背景

当前数据同步从 GitHub Secret `GARMIN_SECRET_STRING_CN` 读取一段 token JSON，并通过 `client.loads()` 放入内存。access token 到期时，`python-garminconnect` 会使用 refresh token 换取新 token，但因为没有文件型 tokenstore，刷新结果不会写回持久存储。CI 进程结束后，新 access token 以及可能轮换的 refresh token 都会丢失。

目标是让每日同步长期自动续期，同时不把 Garmin 明文凭据、明文 token 或高权限 GitHub PAT 放入仓库。

## 决策

使用 SOPS + age 保存加密后的 Garmin tokenstore：

- 仓库只提交 SOPS 加密文件 `.github/state/garmin-cn-token.sops.json`。
- age 私钥保存在 GitHub Secret `SOPS_AGE_KEY`。
- CI 将密文解密到 runner 临时目录中的 `garmin_tokens.json`。
- 同步代码通过 `python-garminconnect` 的文件 tokenstore 接口加载 token，使库在刷新时自动写回最新 token。
- 同步结束或失败后，CI 都检查 tokenstore 是否发生变化；发生变化则重新加密并仅提交密文。
- 现有 `GARMIN_SECRET_STRING_CN` 只用于首次迁移。密文状态文件存在后，不再读取旧 Secret。

不使用 Actions cache 保存 token。GitHub 明确说明 cache 可能被低信任工作流读取，不应存放 Secret 或其他敏感数据。也不让 CI 更新 GitHub Secret，因为这需要额外 PAT 或 GitHub App，扩大凭据权限和维护面。

## 组件边界

### Token 状态模块

在 `backend/sync_garmin/` 中新增一个小型 tokenstore 辅助模块，职责仅包括：

- 验证 tokenstore 文件存在且包含 `di_token`、`di_refresh_token`、`di_client_id`。
- 计算不泄露内容的文件摘要，用于判断刷新前后是否变化。
- 为 CLI 提供清晰、可测试的输入错误。

加密和解密由 SOPS CLI 完成，不在 Python 中自行实现密码算法。

### Garmin 认证封装

`GarminClient` 增加文件 tokenstore 构造入口：

- 使用底层库的文件加载能力，让 `_tokenstore_path` 被设置。
- access token 临近过期时显式执行刷新，使 refresh 失败在认证边界直接暴露。
- 刷新成功后立即将最新 token 写回 tokenstore 文件。
- 保留现有字符串 token 入口，作为本地兼容和首次迁移路径，但 CI 日常同步不再使用它。

### 同步 CLI

`backend.sync_garmin.sync` 增加 `--tokenstore <目录>` 参数：

- `--tokenstore` 与旧位置参数 `secret_string` 互斥。
- CI 使用 `--tokenstore`。
- 本地原有命令继续可用，避免破坏现有使用方式。

### GitHub Actions

`run_data_sync.yml` 增加以下步骤：

1. 安装固定版本并校验来源的 SOPS。
2. 创建仅 runner 当前用户可访问的临时 tokenstore 目录。
3. 如果仓库已有密文，使用 `SOPS_AGE_KEY` 解密；否则从 `GARMIN_SECRET_STRING_CN` 创建首次 tokenstore。
4. 记录同步前 tokenstore 摘要，并执行 Garmin 同步。
5. 使用 `if: always()` 执行持久化步骤：若 tokenstore 有效且摘要变化，则用 SOPS 重新加密。
6. 仅在密文变化时提交 `.github/state/garmin-cn-token.sops.json`。
7. 正常同步成功后，再提交活动数据并发布 Pages。

工作流增加固定 concurrency group，且不取消正在运行的任务，防止两个任务同时消费并轮换同一个 refresh token。

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
          `-- 即将过期 --> refresh --> 原子写回临时 tokenstore
                                      |
                                      v
                           SOPS 重新加密并提交密文
```

首次迁移时，输入来自旧 `GARMIN_SECRET_STRING_CN`；成功创建密文后，后续运行只走密文路径。

## 失败处理

- 缺少 `SOPS_AGE_KEY`：在解密前失败，并给出配置指引，不回退到旧 token，避免悄悄丢失新状态。
- 密文无法解密或 tokenstore 结构不完整：同步停止，不覆盖仓库中的已知密文。
- refresh token 被 Garmin 拒绝：输出明确的重新登录指引；不把无效或空 tokenstore 写回。
- refresh 已成功、活动下载随后失败：`if: always()` 仍保存已轮换 token，避免下一次运行使用失效的旧 refresh token。
- SOPS 加密失败：不提交任何明文文件，任务失败。
- Git push 冲突：任务失败并保留明确日志，不用 `|| echo` 吞掉 token 状态提交失败。
- 日志只输出状态、字段名和摘要，不输出明文 token、密文解密内容或 age 私钥。

## 安全约束

- 明文 tokenstore 只能位于 `$RUNNER_TEMP` 下，目录权限 `0700`、文件权限 `0600`。
- 明文路径加入 `.gitignore` 的防御性规则；工作流提交时显式指定密文文件，不使用 `git add .` 处理 token 状态。
- SOPS/相关 Action 固定到不可变版本或完整 commit SHA，避免可移动 tag 带来的供应链风险。
- 新生成或转换的敏感值立即加入 Actions mask。
- PR 工作流不解密 token；只有定时、手动和受信任的 master 同步任务能访问 age 私钥。

## 测试策略

新增 Python 测试覆盖：

- 文件 tokenstore 会设置可回写路径。
- access token 临近过期时刷新且写回新 access/refresh token。
- refresh 失败时抛出 `GarminAuthError`，不破坏旧文件。
- `--tokenstore` 与旧字符串参数的互斥和兼容行为。
- tokenstore 缺字段、非 JSON、权限异常时给出明确错误。

工作流验证覆盖：

- 首次 bootstrap 能生成 SOPS 密文且仓库中没有明文 token。
- 正常刷新后密文发生变化，下一次运行能从新密文继续同步。
- 模拟刷新后业务失败，持久化步骤仍被执行。
- token 未变化时不产生无意义提交。

## 迁移与回滚

迁移步骤：

1. 本地生成 age key pair。
2. 将私钥存入 GitHub Secret `SOPS_AGE_KEY`，公钥写入 `.sops.yaml`。
3. 保留现有 `GARMIN_SECRET_STRING_CN`，首次 CI 使用它生成密文状态。
4. 验证连续两次同步成功后，删除旧 `GARMIN_SECRET_STRING_CN`。

回滚时可以恢复旧的字符串 token 参数流程；SOPS 密文文件本身不包含可直接使用的明文凭据。若 age 私钥疑似泄漏，应重新登录 Garmin 获取新 token、生成新的 age key，并重新加密状态文件。
