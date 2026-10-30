# 最终交付与架构一致性审计

审计日期：2026-10-30。本记录对应阶段 8；最终提交和 `final` 标签在本地建立，按项目所有者要求不执行推送。

## 交付清单

| 内容 | 位置/状态 |
|---|---|
| 仓库首页与运行说明 | `README.md` |
| 作业要求的主文档 | `doc/README.md`，包含架构方案、过程记录、一致性自查、质量保证 |
| PlantUML 组件图源文件 | `doc/architecture.puml`；主文档保留同一份嵌入源码 |
| 组件图静态预览 | `doc/assets/architecture.svg`，与 PlantUML 中依赖关系对应，便于直接查看 |
| 自动化测试与验收证据 | `test/`、`doc/TEST_REPORT.md` |
| 典型会话输入及预期输出 | `fixtures/assignment.commands.txt`、`assignment.expected.txt` |
| SVG 示例与浏览器截图 | `fixtures/flowchart.svg`、`doc/assets/flowchart-preview.png` |
| 精确依赖锁定 | `package-lock.json`；运行依赖 `@xmldom/xmldom@0.9.12` |
| 可重复架构检查 | `scripts/ArchitectureAudit.mjs`；`npm run check:architecture` |
| 最终提交标识 | 本地附注标签 `final`，由项目所有者完成最后推送 |

## 实际模块与方案核对

```text
src/
├── domain/
│   ├── shapes/        图形抽象、六种图形及 Visitor 协议
│   ├── tree/          不可变 ShapePlacement
│   ├── memento/       不透明状态快照
│   ├── internal/      树变更令牌
│   ├── errors/        领域错误
│   └── *.ts           文档聚合、工厂、schema、数值及 SVG 值对象
├── application/
│   ├── commands/      Command 层次与十种编辑命令
│   ├── history/       undo/redo 和 IO 屏障
│   ├── ports/         SVG 文件端口与读取结果
│   └── SvgEditor.ts   当前文档与用例协调
├── infrastructure/
│   └── svg/           DOM 编解码和真实文件适配器
├── cli/               解析、分发、反馈、格式化与 REPL
└── main.ts            组合入口
```

模块目录与演进后的方案一致。相对于阶段 1，新增的 Memento、Visitor、ViewBox、SVG 展示属性及数值解析是已经记录的细化；CLI 对领域只读接口的依赖是在阶段 5 明确修订的规则。没有把这些差异隐瞒为“完全按最初设计实现”。

## 依赖方向审计

自动检查全部生产 TypeScript 源文件，验证：

- domain 只依赖自身；application 只依赖 application/domain；
- infrastructure 只引用自身、domain 和 application/ports；
- CLI 可调用 application 并读取 domain，但不能引用 domain/internal；
- Node 文件接口、XML 库不进入 domain/application；
- 每个导出类独立成文件且类名与文件名匹配；
- 相对 import 指向实际存在、大小写一致的文件；
- 没有 `switch(...)` 类型分派，文档本地链接有效。

实际检查结果：51 个生产源文件、49 个导出类、179 条静态 import 全部通过；另外两个无类文件为组合入口 `main.ts` 和内部令牌模块。主文档的 PlantUML 代码与独立 `.puml` 文件内容一致。

检查方式是静态 import/类声明扫描，不是对所有动态行为的形式化证明。另人工抽查：`CommandDispatcher` 的编辑入口全部调用应用层；`TreeFormatter/ShapeFormatter` 只读取公开字段和 Visitor；`main.ts` 注入 `SvgFileStorage`，应用层不直接创建文件适配器。

领域内部存在组合关系和类型引用，例如 Shape 与 Group、ShapeVisitor 与具体图形的引用；它们不是跨层循环依赖。`TreeMutationToken` 是内部协作约定而非安全隔离机制；应用层/CLI 没有导入它。

## 模式与范式核对

| 检查 | 代码依据 |
|---|---|
| 强制 Command 模式 | `application/commands/Command.ts` 统一生命周期；十种编辑操作独立成类 |
| 一条命令一个历史单元 | `CommandHistory.execute/undo/redo`，只在成功后更新栈 |
| Composite | Group 与叶子共享 Shape，递归变换由多态完成；删除面向整棵子树 |
| Memento | 几何精确值和结构对象引用在领域内封装，避免数值逆运算与浅拷贝 |
| 两处允许的名称分发 | `CommandDispatcher.handlers` 和 `ShapeFactory.builders`，已列为后续重构边界 |
| 显示/序列化多态 | ShapeVisitor；CLI 和 SVG Writer 分别实现访问器 |
| 字段封装 | 图形几何与子节点集合私有，通过方法和只读访问器操作 |
| 文件隔离 | SvgStorage 端口由基础设施实现，失败不替换文档或清空历史 |

## 质量证据与范围

阶段 7 的 109 项测试、640 条混合输入、1038 次完整撤销/重做状态检查与覆盖率，详见 [TEST_REPORT.md](TEST_REPORT.md)。阶段 8 复核主文档、架构图、链接、交付文件及可重复检查入口，不以增加无关功能代替最终审计。

最终复跑 `npm.cmd run test:coverage`：严格模式构建成功，109 项测试全部通过，行/分支/函数覆盖率仍为 96.83% / 94.43% / 99.30%。随后 `npm.cmd run check:architecture` 再次通过。组件图 SVG 已在 Edge 无头浏览器中实际渲染并目视检查。

交付文件扫描没有发现被跟踪的 node_modules、dist、tmp、coverage、环境密钥文件或日志；这些生成目录的忽略规则保留。阶段 1—7 的提交已经分步记录并上传，本阶段新增文档与审计工具形成单独的最终提交。

仍如实保留以下约束：SVG 只支持 README 声明的子集；大文档的结构快照开销未优化；实际执行环境是 Windows；部分内部防御分支未覆盖。作业未提供具体截止日期，项目所有者须在课程平台规定时间前完成最终上传。

## 最后由项目所有者执行

确认工作区干净，检查本地最终提交和附注标签：

```bash
git status
git log -1 --oneline
git show --no-patch final
```

上传最终提交及标签：

```bash
git push origin main
git push origin final
```

最后检查远程标签所指向的提交：

```bash
git ls-remote --tags origin final "final^{}"
```

`final^{}` 行应等于本地 `git rev-parse HEAD`。本阶段没有执行任何 push；前七阶段已经上传的历史保持原样。
