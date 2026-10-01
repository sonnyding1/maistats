# maistats

基于 Vite + React 的 Web 前端，用于浏览静态 song database 与 `maistats-record-collector` 的数据。

## Requirements

- Node.js 20+（建议 20 LTS 或更高）
- npm 10+

## What It Does

- 浏览分数列表与游玩记录
- 按曲名、谱面类型、难度、版本、评级、FC、SYNC 筛选
- 按达成率、定数、间隔天数排序及范围搜索
- 查看单曲详情与每个谱面的 `play_count`
- 通过部署环境变量与浏览器内的界面设置切换 API origin

## Quick Start

本应用是 monorepo 中的 npm workspace 成员。以下命令均在仓库根目录执行。

1. 安装依赖：

```bash
npm ci
```

2. 创建环境变量文件：

```bash
cp apps/maistats/.env.example apps/maistats/.env
```

3. 如有需要，修改 `.env`：

```env
SONG_DATABASE_URL=https://maimai-charts.muhwan.dev
RECORD_COLLECTOR_SERVER_URL=<your-record-collector-server-origin>
```

本地默认值见 [.env.example](./.env.example)。

4. 启动开发服务器：

```bash
npm run dev --workspace apps/maistats
```

可访问的本地地址由 Vite 输出到终端。

## Environment Variables

- `SONG_DATABASE_URL`
  - 静态 song database 的基础 URL
- `RECORD_COLLECTOR_SERVER_URL`
  - `maistats-record-collector` 的 origin

这些值会作为应用默认的 API 连接地址。运行期间可在界面的 `Server Connection` 中按浏览器覆盖。

部署到 Cloudflare Pages 时，请勿把这些值提交到仓库，而应配置为 Pages 的环境变量。

## Scripts

- `npm run dev --workspace apps/maistats`：启动开发服务器
- `npm run build --workspace apps/maistats`：先做 TypeScript 检查，再生成生产构建
- `npm run preview --workspace apps/maistats`：在本地预览构建结果

## Build

```bash
npm run build --workspace apps/maistats
```

构建产物生成在 `dist/`。

如需预览：

```bash
npm run preview --workspace apps/maistats
```

预览地址由 Vite 输出到终端。

## Deploying With Cloudflare Pages

推荐的部署目标是 Cloudflare Pages。

默认配置：

- 关联 GitHub 仓库
- Production branch：`main`
- Framework preset：`Vite` 或 `None`
- Build command：`npm ci && npm run build --workspace apps/maistats`
- Build output directory：`apps/maistats/dist`
- Root directory：仓库根目录
- `NODE_VERSION=20`
- Deploy command：`npx wrangler deploy --config apps/maistats/wrangler.jsonc`

环境变量：

- 在 Production 与 Preview 中都设置 `SONG_DATABASE_URL`、`RECORD_COLLECTOR_SERVER_URL`
- 如有需要，绑定自定义域名

本仓库包含 `@cloudflare/vite-plugin` 与 `wrangler.jsonc`，因此也支持在根目录执行 `npx wrangler deploy --config apps/maistats/wrangler.jsonc` 进行部署。

运行方式：

- 推送到 `main` 时部署 production
- 创建或更新 PR 时部署 preview

## Data Notes

- Score 页面的 Last Played/Days 来自 `maistats-record-collector` 的 `/api/scores/rated`（`scores` 表的 `last_played_at`）。
- Playlog 页面来自 `maistats-record-collector` 的 `/api/recent?limit=10000`（`playlogs` 表）。
- 每个谱面的 `play_count` 不由 playlog 推算，而是直接使用 `maistats-record-collector` score API 返回的值。
- 如需更长时间跨度的分析，需要在 record collector 中新增 API（例如查询全部 playlog）。
