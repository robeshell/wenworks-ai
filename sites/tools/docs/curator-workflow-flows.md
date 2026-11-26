# Curator 流程草图 v1

日期：2026-09-08。目标流程，尚未实施。配套：[设计方案](curator-workflow-redesign.md) · [可点击页面草图](curator-workflow-sketch.html)。

## 01 入口与信息架构

```mermaid
flowchart TD
  Home[工作台] --> Resume[处理中 / 待检查 / 失败]
  Library[资源库] --> Find[搜索与筛选已有资源]
  New[收录资源] --> Source[链接或正文 / 可选类型]
  Resume --> Space[同一资源工作区]
  Find --> Space
  Source --> Space
  Space --- Content[内容 / 预览]
  Space --- Meta[类型 / 分类 / 标签]
  Space --- Agent[持续对话]
  Space --- Evidence[来源 / 历史]
  Settings[系统设置] -. 提供分类与模型配置 .-> Space
```

工作台解决“接着处理”，资源库解决“找到内容”，收录入口解决“开始一条”。工作区负责把事情做完。

## 02 新收录至完成

```mermaid
flowchart TD
  Start[提交链接或原文] --> Persist[创建工作区并暂存来源]
  Persist --> Dup{已有相同资源?}
  Dup -->|打开已有| Existing[恢复已有工作区]
  Dup -->|没有或明确另建| Read[读取来源并显示阶段]
  Persist -->|手动填写| Draft[当前工作草稿]
  Read -->|足够证据| First[首稿立即可编辑]
  Read -->|失败| Fallback[保留来源 / 补贴正文 / 重试]
  Fallback --> Read
  Fallback -->|手动继续| Draft
  First --> Draft
  Draft --> Edit[手改或对话修改]
  Edit --> Draft
  Draft --> Save[保存草稿]
  Save --> Done[原地显示已保存]
  Done --> Next[继续收录]
  Done --> Back[返回资源库]
  Done -->|继续编辑| Draft
  Next --> Start
  Draft -. 按需 .-> Enhance[润色 / 翻译 / 补资料]
  Enhance -->|版本检查后应用| Draft
```

首稿出来即可检查类型与内容。润色、翻译不阻塞首稿交付；保存后没有强制跳页。

## 03 已有资源修改与公开版本

```mermaid
flowchart TD
  Open[打开资源] --> Working[读取工作草稿与已保存版本]
  Working --> Modify[手动编辑 / AI 修改]
  Modify --> Autosave[自动暂存工作草稿]
  Autosave --> Save[保存草稿版本]
  Save --> Finish[已保存 / 可离开]
  Save --> Publish[加入公开目录 / 更新公开内容]
  Publish --> Check{发布校验通过?}
  Check -->|否| Missing[定位缺失字段]
  Missing --> Modify
  Check -->|是| Commit[提交公开快照及导出任务]
  Commit --> Export{静态产物导出成功?}
  Export -->|否| Error[保存仍有效 / 导出可重试]
  Error --> Commit
  Export -->|是| Local[公开内容已更新]
  Local --> Git[现有 Git 发布流程]
  Git --> Verify[核验部署后才算线上更新]
  Previous[原公开版本] -. 工作草稿编辑期间保持可用 .-> Working
```

保存、导出和线上部署各有结果。已发布条目的编辑草稿不会自动替换公开版本。

## 04 大分类改错后的恢复

```mermaid
flowchart TD
  Trigger[手动切类型 / 对话要求改类型] --> Target[选择目标类型]
  Target --> Snapshot[记录完整当前快照]
  Snapshot --> Preview[预览保留字段 / 待调整 / 待补齐]
  Preview --> Decision{应用到草稿?}
  Decision -->|取消| Original[保持原内容]
  Decision -->|应用| Map[映射兼容字段 / 保留不兼容字段]
  Map --> Category[重选无效分类 / 标明目标必填项]
  Category --> Draft[转换后的工作草稿]
  Draft -->|撤销| Restore[检查后续修改并恢复前一快照]
  Restore --> Original
  Draft --> Save[保存 / 保留资源身份和对话]
  Save --> Publish[用户更新公开版本]
  Publish --> Files[切换导出位置 / 生成旧路径跳转页]
```

示例：技能转站点时，长正文保留在历史中，不能因站点没有长文字段而丢失。保存草稿不立即移除旧公开页面。

## 05 Agent 多轮处理

```mermaid
flowchart TD
  Msg[用户发消息] --> Context[读取最新草稿 / 来源 / 历史 / 待执行提案]
  Context --> Intent{当前意图}
  Intent -->|讨论| Reply[直接回答]
  Intent -->|局部修改| Patch[生成字段改动]
  Intent -->|转换类型或全文替换| Proposal[展示影响与待执行提案]
  Proposal --> Confirm[确认或修改要求]
  Confirm --> Context
  Intent -->|承接明确提案| Execute[执行该提案]
  Intent -->|补查资料| Fetch[针对性读取来源]
  Fetch --> Patch
  Execute --> Patch
  Patch --> Version{目标字段有新修改?}
  Version -->|没有| Apply[应用到工作草稿 / 显示差异与撤销]
  Version -->|有| Conflict[保留手改 / 展示冲突选择]
  Conflict --> Apply
  Apply --> Next[继续对话或保存]
  Reply --> Next
  Next --> Msg
```

“好的”承接当前唯一且有效的提案，不需要重复完整指令。聊天本身不隐含发布权限。

## 06 处理中补充要求与异常

```mermaid
flowchart TD
  Running[任务运行中 / 内容仍可编辑] --> Input[用户补充要求]
  Input --> Choice{何时处理?}
  Choice -->|下一步| Queue[显示排队消息 / 可取消]
  Queue --> Latest[当前运行结束后读取最新草稿]
  Choice -->|现在调整| Stop[停止当前运行 / 等待停止确认]
  Stop --> Keep[保留已完成内容与来源]
  Keep --> Latest
  Latest --> Next[执行补充要求]
  Running -->|失败| Failed[显示失败阶段与原因]
  Failed --> Retry[重试失败步骤]
  Failed --> Manual[手动继续编辑与保存]
  Failed --> End[结束处理 / 保留资料和记录]
  Retry --> Latest
  Running -->|刷新或断线| Reconnect[恢复工作区 / 重连任务状态]
  Reconnect --> Alive{任务仍运行?}
  Alive -->|是| Running
  Alive -->|已结束| Result[读取最终结果并检查版本]
  Alive -->|中断| Failed
```

结束处理把任务移出待处理队列，不把失败改写成成功，也不删除资料。恢复表示复用上下文重新执行必要步骤，不承诺从任意模型位置续跑。

## 07 内容状态与 AI 状态独立

```mermaid
stateDiagram-v2
  state 内容 {
    [*] --> 工作草稿
    工作草稿 --> 已保存草稿: 保存
    已保存草稿 --> 工作草稿: 继续修改
    已保存草稿 --> 有公开版本: 加入公开目录并导出成功
    有公开版本 --> 有未公开修改: 编辑并暂存
    有未公开修改 --> 有公开版本: 保存并更新公开内容
    有公开版本 --> 已归档: 归档
    已归档 --> 已保存草稿: 恢复为草稿
  }
  state AI运行 {
    [*] --> 空闲
    空闲 --> 处理中: 发起任务
    处理中 --> 已完成: 结果应用或待检查
    处理中 --> 已停止: 停止
    处理中 --> 失败: 错误或中断
    已停止 --> 处理中: 带新要求继续
    失败 --> 处理中: 重试必要步骤
    已完成 --> 处理中: 下一轮
  }
```

## 08 低保真页面的评审路径

打开配套 HTML 草图，按顺序操作：

1. 收录：输入来源，点击“开始整理”，查看处理中与首稿状态。
2. 编辑：修改摘要，向 Agent 发送“摘要短一点”，查看同一草稿变化及撤销。
3. 类型转换：将技能切成站点，查看影响，再应用或取消。
4. 保存：点击“保存草稿”，停留原地；选择继续收录或返回资源库。
5. 异常恢复：查看读取失败，选择补贴正文、重试或手动继续。

草图只演示上述产品交互和页面结构，不是可操作真实数据的后台，也不代表真实模型性能。原始流程以本文件的 Mermaid 为可维护源。

## 本次草图检查记录

- JavaScript 语法检查及差异空白检查通过。
- 在实际浏览器检查了 1280px 桌面布局和 390px 窄屏布局；两种宽度均未产生横向溢出。
- 已操作：提交来源、处理中排队补充要求、首稿完成后执行摘要修改、类型转换预览及应用、转换后手动改标题、撤销转换且保留标题、保存原地完成、继续收录、窄屏内容与对话切换、错误恢复操作展示。
- 草图不持久化演示数据，刷新会复位；自动暂存、模型回答、发布和恢复结果均为设计演示，不是后台能力验收。
- Mermaid 源共 7 张；本轮未使用 Mermaid 渲染器逐张验证，阅读器需支持 Mermaid。
