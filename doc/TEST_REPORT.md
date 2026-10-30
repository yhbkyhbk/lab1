# 阶段 7：验收与边界测试报告

验证日期：2026-10-30。验证环境：Windows、Node.js 24.19.0、npm 11.17.0、TypeScript 7.0.2。

## 实际结果

| 检查 | 结果 |
|---|---|
| `npm.cmd ci` | 根据锁文件重装成功；审计 6 个包，0 个已知漏洞 |
| 严格模式构建 | 通过，包含在各测试脚本中 |
| 完整测试 | 109 项通过，0 项失败、取消、跳过 |
| 单独验收集 | 18 项通过，0 项失败 |
| 完整作业会话 | 真实子进程输出逐行匹配预期文件，退出码 0、stderr 为空 |
| 固定种子混合操作 | 640 条输入，519 条成功、121 条按规则拒绝 |
| 历史一致性 | 每条成功编辑都逐一撤销、重做，并检查精确状态和对象身份 |
| 保存后读取 | 六种图形、层级、顺序、样式、文字与 viewBox 保持一致 |
| 浏览器预览 | 阶段 6 的 Edge 实际渲染截图已保存在 `assets/flowchart-preview.png` |

## 复现命令

在工程根目录执行：

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run test:acceptance
npm.cmd run test:coverage
```

使用普通终端时可以将 `npm.cmd` 替换为 `npm`。覆盖率脚本已在上述 Node 24 环境验证，使用 Node 内置的实验性覆盖率选项；不需要额外测试框架或覆盖率依赖。

## 需求与测试对应

| 要求/风险 | 主要测试依据 |
|---|---|
| 六种类型与可选样式 | `ShapeFactory.test.ts`、`ShapeGeometry.test.ts`、`CliCommands.test.ts` |
| 公共与各类型几何属性白名单 | `BoundaryAcceptance.test.ts` 中六种类型的参数化测试 |
| 全局唯一且大小写敏感的 id | `SvgDocument.test.ts`、`SvgCodec.test.ts`、`BoundaryAcceptance.test.ts` |
| 缺 id 自动分配并避让后出现的显式 id | `SvgCodec.test.ts`、`SvgStorage.test.ts` |
| Composite 递归 move/scale、溢出失败原子性 | `Group.test.ts`、`CommandHistory.test.ts`、`BoundaryAcceptance.test.ts` |
| 分组、跨父收编、解组、防环及同级 z-order | `TreeEditing.test.ts`、`CliCommands.test.ts` |
| 一条命令一个 undo 单元、清空 redo | `CommandHistory.test.ts`、`HistoryStress.test.ts` |
| 失败命令保留树、引用、索引和历史 | `CommandHistory.test.ts`、`BoundaryAcceptance.test.ts`、`HistoryStress.test.ts` |
| 显示命令跳过历史、IO 成功后屏障 | `CliCommands.test.ts`、`SvgStorage.test.ts`、`SessionAcceptance.test.ts` |
| 双引号、中文、反斜杠、空文本、颜色及整行注释 | `Tokenizer.test.ts`、`BoundaryAcceptance.test.ts` |
| tree 内联几何与 show 的父节点/展示属性 | `CliCommands.test.ts`、`BoundaryAcceptance.test.ts` |
| SVG/XML 转义、空白、CDATA、实体、字体和坐标系 | `SvgCodec.test.ts`、`SessionAcceptance.test.ts` |
| 文件路径、写失败清理与无参数保存 | `SvgStorage.test.ts` |
| 完整 transcript、EOF、最终行无换行 | `SessionAcceptance.test.ts`、`CliSession.test.ts` |
| 本阶段拒绝 box | `ShapeFactory.test.ts`、`CliCommands.test.ts` |

上述文件均位于 `test/`。完整测试入口为 `TestSuite.ts`，阶段 7 独立入口为 `AcceptanceSuite.ts`。

## 会话验收方式

`fixtures/assignment.commands.txt` 按要求第 6 节记录完整命令顺序，`fixtures/assignment.expected.txt` 保存预期结果。测试在独立临时目录中放置 `other.svg`，通过真实 CLI 进程执行全部命令。

比较时只去掉启动横幅、提示符并统一 CRLF/LF，不忽略正文空白、错误文案、警告顺序或属性值。树形列间采用当前程序的单空格格式，与要求示例的对齐填充空格不同；层级、顺序和字段值一致。测试还单独读回 `demo.svg`，确认 c1 的 cx 为 130、title 已撤销回原内容、box 恢复到 markers。

## 混合历史验证

每个种子生成 160 条可重复输入，包含创建、移动、缩放、样式修改、分组、解组、移动归属、z-order、删除与有意无效操作。

| 种子 | 成功编辑 | 拒绝输入 |
|---|---:|---:|
| 17 | 127 | 33 |
| 42 | 121 | 39 |
| 2026 | 135 | 25 |
| 65537 | 136 | 24 |
| 合计 | 519 | 121 |

`DocumentSnapshot` 从公开 API 独立遍历根和 children，检查无环、无重复对象/重复 id、父指针、document 归属、id 查找和元素计数；通过规范化 SVG 比较全部属性，并保存活动图形引用以检查恢复后的对象身份。

每个失败输入都比较操作前后的快照及双栈长度。完成后逐条撤销全部 519 次成功编辑，再逐条重做，共检查 1038 次恢复状态；另外每隔一段执行即时 undo/redo 和序列化读回比较。该测试验证状态一致性，具体操作的正向语义由定向用例验证，不把实现自己的快照当作唯一正确性依据。

## 本阶段实际发现与修复

1. 数值规则不一致：`create` 和 `move` 拒绝 `0x10`，但 `set r x 0x10` 原来直接调用 Number，会成功写入 16 并清空 redo。先增加失败回归用例确认问题，再引入 `FiniteNumber` 统一领域属性、CLI 参数、工厂参数和 SVG 数值规则；现在非法语法不会改变状态或历史。
2. 展示信息不完整：导入的 `font-size/text-anchor` 可以读写保留，但原 `show` 没有显示。新增测试确认后，统一把已保留的展示属性输出到 show/tree；它们仍不进入 set 白名单。

最初阶段 7 验收集出现 2 项失败，均修复后转为通过。后续完整覆盖率测试与锁文件重装后的重复验证也全部通过。

## 覆盖率

由 `npm.cmd run test:coverage` 实际输出，统计范围限定为执行到的 `dist/src/**` 生产代码，不含测试代码与第三方依赖。这是编译后 JavaScript 的 V8 覆盖率，不能等同于源 TypeScript 的精确语义覆盖率。

| 指标 | 结果 |
|---|---:|
| 行覆盖率 | 96.83% |
| 分支覆盖率 | 94.43% |
| 函数覆盖率 | 99.30% |

仍有未触发的防御分支和内部保护路径，例如部分错误父节点/错误内部令牌、非法恢复位置、内部成员关系失配等；未为了凑 100% 而直接破坏私有字段或制造不可能通过正常 CLI 出现的状态。该指标作为功能用例、文件回环和真实进程验证的补充，不宣称证明代码没有缺陷。

## 边界与待完成项

- 仅验收本阶段六种图形及 README 中声明的 SVG 子集；transform、任意 CSS、path/tspan 等仍明确拒绝，不声称支持任意第三方 SVG。
- 尚未针对超大文档、很深的嵌套树、长历史或大量并发 IO 做性能验证；当前结构快照策略的内存成本已在架构方案中记录。
- 本次实际运行环境是 Windows；没有声称已在 Linux/macOS 完成同样验证。
- 测试临时文件位于本次新建的隔离目录，测试完成后只清理该目录；示例与源文件不被测试覆盖。
- 最终文档一致性审计、提交内容复核和本地 `final` 标签由阶段 8 完成，见 [FINAL_AUDIT.md](FINAL_AUDIT.md)；最后上传由项目所有者操作。本报告保留阶段 7 的实际功能测试结果。
