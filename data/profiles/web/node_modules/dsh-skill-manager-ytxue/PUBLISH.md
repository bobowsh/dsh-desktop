# PUBLISH GUIDE · 发布到 GitHub 并加入 dsh-plugin 主题

本文件指导将 dsh-skill-manager-ytxue 发布为开源仓库，并让它出现在
**DSH 插件库**（https://github.com/topics/dsh-plugin）——GitHub 会聚合所有带
`dsh-plugin` topic 的仓库，DSH 社区（awesome-dsh-plugin 等）据此发现新插件。

## 0. 发布前（隐私/代码审核）

按 `PRIVACY-CHECKLIST.md` 逐项核对；确认 `package.json` 的 `repository.url`
已改为真实仓库地址；`LICENSE` 版权行按需修改。

## 1. 在 GitHub 创建仓库（浏览器操作，一次）

1. 登录 GitHub → New repository
2. Repository name: `dsh-skill-manager-ytxue`（与包名一致）
3. Public 公开；**不要**勾选 README/.gitignore/LICENSE（本地已就绪，避免冲突）
4. 创建后复制仓库地址：`https://github.com/YTxue/dsh-skill-manager-ytxue.git`

## 2. 推送本地发布仓库（publish/，已是干净 git 仓库）

```bash
cd publish
git remote add origin https://github.com/YTxue/dsh-skill-manager-ytxue.git
git branch -M main        # 默认 master，改成 GitHub 习惯的 main
git push -u origin main
```

> 推送需 GitHub 认证：可用浏览器方式（HTTPS + 凭据管理器）或配置 PAT。
> 认证帮助：GitHub → Settings → Developer settings → Personal access tokens
> （勾选 `repo` scope），然后 `git push` 时输入用户名 + token 作为密码。

## 3. 添加 dsh-plugin topic（关键一步，浏览器操作）

1. 打开仓库页面 → 右侧 **About** → ⚙️（Topics/主题 齿轮）
2. 输入 `dsh-plugin` → Add
3. 保存后仓库即出现在 https://github.com/topics/dsh-plugin
   （以及 https://github.com/topics/dsh-plugin 列表页）

可选附加 topic：`deepseek-harness`、`dsh`、`skill-manager-ytxue`。

## 4. 让社区发现（可选）

- 给 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提 PR 收录；
- 在 [DSH 官方 Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 发帖介绍；
- 保持 `dsh-plugin` topic 不变，GitHub topic 页会自动聚合。

## 5. 后续更新流程

```bash
cd publish
git add -A && git commit -m "feat: ..."
git push origin main            # GitHub 自动更新
npm publish                     # 如已发布 npm，自动升版
```
