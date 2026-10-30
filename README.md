# SVG 编辑器（CLI）

Lab1 Phase 1：使用 TypeScript 和面向对象设计实现的命令行 SVG 编辑器，包含六种图形、嵌套分组、Command 撤销重做和真实 SVG 文件读写。

作业要求的完整文档入口：[doc/README.md](doc/README.md)。验收证据见[测试报告](doc/TEST_REPORT.md)，交付状态见[最终审计](doc/FINAL_AUDIT.md)。

## 运行

```bash
npm ci
npm run cli
```

Windows PowerShell 如拦截 `npm.ps1`，使用 `npm.cmd`。本次验证环境是 Node.js 24.19.0、npm 11.17.0。

进入 `svg>` 后逐行输入：

```text
init 800 600
create g node
create rect body 10 20 160 60 #4a90d9 in node
create text label 30 55 "开始" in node
move node 0 100
undo
tree
save demo.svg
read demo.svg
help
```

用浏览器打开生成的 `demo.svg` 查看效果。Windows 在新行按 Ctrl+Z 再回车结束输入，Unix 使用 Ctrl+D。

## 验证

```bash
npm test
npm run test:acceptance
npm run test:coverage
npm run check:architecture
```

阶段 7 验收：109 项测试通过；生产 JavaScript 行覆盖率 96.83%、分支覆盖率 94.43%。支持本阶段 `rect/circle/ellipse/line/text/g` 六种类型；完整 SVG 子集边界及设计权衡见 [doc/README.md](doc/README.md)。
