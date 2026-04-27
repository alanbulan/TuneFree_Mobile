# TuneFree Desktop

TuneFree Desktop 是 TuneFree 的 Web PC / 桌面端 Next.js 版本。

## 项目定位

这个目录是独立的桌面端项目根目录，对应远程分支 `desktop`。

- 桌面端：`desktop-next/` → `origin/desktop`
- iOS/PWA React：`ios-pwa-react/` → `origin/main`
- Flutter：`flutter/` → `origin/flutter`

## 技术栈

- Next.js 15
- React 18
- TypeScript
- Cloudflare Pages Functions
- Web Audio API / Canvas

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：`http://127.0.0.1:3001/`

## 构建

```bash
npm run build
```

静态导出产物输出到 `out/`，Cloudflare Pages 配置见 `wrangler.json`。

## 目录结构

```text
app/          Next.js App Router 页面与全局样式
functions/    Cloudflare Pages Functions
src/core/     音乐业务层、服务、上下文、类型
src/desktop/  桌面端 UI 与页面模块
```
