# dsh-plugin-search

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

不用官方 DeepSeek API，`web_search` 不再 401。

默认零配置。装上就把内置 `web-search-deepseek` 关掉，工具名还是 `web_search`。

对应：[Discussions #779](https://github.com/deepseek-ai/deepseek-harness/discussions/779) · [#408](https://github.com/deepseek-ai/deepseek-harness/discussions/408) · 介绍帖：[Show and tell #1715](https://github.com/deepseek-ai/deepseek-harness/discussions/1715)

## 安装

```powershell
dsh plugin --profile web add github:shinjiyu/dsh-plugin-search
```

然后**重启** `dsh web`。旧会话的工具表不会更新。

## 配置

可以不配。没 key 走 Tavily keyless。

有账号再设：

```
TAVILY_API_KEY=tvly-...
```

不要把 key 写进仓库。

## 30 秒验收

1. 主模型用 GLM / 网关 / 任何非官方 DeepSeek  
2. 不要设 `DEEPSEEK_API_KEY`  
3. 问「今天 DeepSeek Harness 最新 Discussions 说了什么」  
4. 过关：`web_search` 能出链接，不再红字 401  

## 不要做

- 不要改 `runtime/` 或官方 `web-search-deepseek`  
- 不要把它宣传成搜索引擎全家桶  

## 社区

微信群：**deepseek harness 交流群**

![微信群二维码](docs/community/wechat-group.png)

微信群码大约 7 天过期（本张到 **2026-08-22**）。

宣发稿在 [`docs/PROMO.md`](docs/PROMO.md)。

## License

MIT
