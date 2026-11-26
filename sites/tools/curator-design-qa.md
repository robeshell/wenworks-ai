## 2026-09-28 — 审核模式，去掉多余的保存和确认

用户反馈：确认完一条点「下一条」跳到的不是下一条待确认的；整体操作多余。走查从工作台处理一条待确认的步骤：点进编辑页 → 切到「修改记录」→ 点「差异」弹窗看改动 → 有提案先「采用修改」→「更新公开目录」→ 确认弹窗再点「确认更新」→「下一条」却按整个资源库的更新时间排序。

- 保存有四层（自动暂存、保存草稿、发布、推送），前两层对维护者没有区别；「保存草稿」按钮去掉，「存为草稿（不公开）」放进「更多」，转换类型和归档也放进去。
- 发布确认弹窗去掉：它不要求做任何决定，本地发布可随时再改，推送才上线。
- 审核模式：工作台点进的条目带上所在分组的顺序（`CuratorNavigation.review`，未保存的收录用 `ws:<id>` 记入），顶部显示进度和本次会发布的改动；主按钮「发布并下一条」会先采用 Agent 的修改提案再发布，然后进入同组下一条，组末回到工作台。「跳过」直接看下一条。
- 顺带发现 Claude-Mem 的中文正文被存成了 `{"body":"..."}` JSON 包装，线上中文详情页直接显示了原始 JSON。已在它的工作区里解开，等发布；新增「正文格式有误」检查，同类问题会出现在待处理里。
- `npm test` 75 通过。实查：从「需要你确认」进入第 1/16 条，进度与改动摘要显示正确，「更多 / 跳过 / 发布并下一条」到位。用户当时正在另一个浏览器里逐条发布，所以没有在这里点发布；发布流程本身沿用原有保存接口。

## 2026-09-28 — 批量让 Agent 处理待办；编辑页显示封面与图标

- 工作台两个待处理分组加「让 Agent 处理」：确认弹窗说明多少条交给 Agent、多少条只抓封面、多少条需要人决定。服务端 `POST /dashboard/fix` → `autoFix()`：按资源打开工作区，缺封面的排进封面队列（并发 2），其余可修问题拼成一条指令交给工作区 Agent（同样受并发 2 限制）。结果留在工作区为未保存修改，不自动保存或发布。
- 打开与资源库关联的工作区时，如果没有未保存修改但落后于资源库（比如被封面回填更新过），先自动合并到最新保存版本（`openFresh()`）。之前这类工作区会显示「资源库中的已保存版本在其他位置更新了」，而且在旧草稿上修改后保存会冲掉新封面。
- 修正合并：封面字段加入前写下的工作草稿没有 `cover` 键，而基准版本被规整成空字符串，合并时误判为本地修改，报出假冲突。现在三方都先规整再合并。
- 编辑页：封面和图标从折叠的属性区移到分类下方，直接显示预览和采集按钮；可填「改从这个页面截图」。修正：工具的一句话定位（公开卡片显示的 verdict）被反写的条件隐藏，无法编辑。
- `npm test` 73 通过（新增：批量处理只交给 Agent 能修的问题且结果未保存、落后工作区自动合并、缺字段草稿合并不报假冲突）。

## 2026-09-28 — 工作台重做：一张待处理清单、公开站状态、批量收录

问题：五个互相重叠的队列（工作区 8、待确认 9、待补齐 22、草稿 13、分析失败 5）对 35 条资源给出 57 条"待办"。实际拆开看：8 个工作区都已保存、没有进行中的操作；14 条待确认/失败是工作区改版前的收录流程留下的，其中 Sub2API、reverse-skill 各重复多次且早已发布；待补齐只给数字不给原因，而且把旧格式（字符串）正文误判为缺中文正文。真正要做的事（公开站有多少改动没发布、哪些缺封面或分类）反而看不到。

改动：

- 先用真实数据做静态对比稿，确认方向后再实现。
- 一张待处理清单，按资源去重，分「需要你确认 / 没写完的草稿 / 已发布但不完整」，每条写明原因（缺封面、缺分类、缺英文正文、卡片文案会被截断……）和一个动作。原因来自新的 `contentIssues()`，`contentIssueCount` 保留为其长度。
- 修正：字符串正文按中文正文计；新增缺封面、卡片文案会被截断两项检查。后者用公开卡片两行能放下的量（48 字 / 30 词），而不是写作目标 32 字——按 32 字会把 11 条已发布内容标红，其中没有一条在卡片上真的被截断。
- 顶部收录框：一次可粘贴多个链接，已收录的跳过并提示，无效链接忽略；服务端给 Agent 运行加了并发上限 2。
- 公开站卡片：已公开数量、各板块数量、未提交的公开文件改动（只读 `git status`），按用户选择不放发布按钮。构建校验只显示状态，符合 README 里"只在系统页执行"的约定。
- 一键清理：7 天没动、已保存、无修改的工作区和旧分析记录；只在点击时执行。7 天门槛是因为打开任何资源都会建工作区，不设门槛的话每次编辑完这里都会冒出来。
- 视觉：Curator 改用 Geist，主色从橙色改为墨黑（Mantine 主色阶和 Curator 内 `--accent` 一起改），与公开站一致；页脚和外观菜单里的主题色选择器删除。清掉旧工作台遗留的 85 条样式规则。

验证：1440 和 375 宽实查；在收录框贴入已收录链接和无效文本，确认跳过、忽略且没有新建工作区（未触发真实模型调用）；「查看全部」进入资源库并带上筛选；资源库、编辑页、系统页换色后检查无异常。`tsc`、`eslint`、`npm test`（70 通过：新增并发上限、停止持有名额的任务后排队任务仍会开始、空闲工作区列举与清理、清理后可重新打开编辑四项）、`next build` 通过。复核时修掉一个排队 bug：被唤醒的任务留着中止监听，之后若被停止会误删队列里另一条的等待，导致它永远不开始。外观菜单一并删除：Curator 固定浅色，放一个明暗切换只会把页面染一半，还会顺带切换公开站的主题。未验证：清理按钮的真实执行（会改动本地数据，留给用户点击；逻辑有测试覆盖）；多条链接真实排队整理（会消耗模型额度）。

## 2026-09-06 — 工作台首页重新规划与浅色骨架屏

- 主区改为四个处理队列：待确认、待补齐、草稿、分析失败。每页四条；分析任务可翻页，资源类队列进入带筛选的资源库查看全部。
- 去掉混合相加的待办总数，草稿数量直接使用服务端 total，避免根据有限预览做去重后给出不完整计数。
- 右侧是五类资源的已发布/全部数量及构建状态；下方展示最近修改的四条资源，直接链接编辑器。
- 全后台 Skeleton 使用 #fafbfc 底色与 #edf0f2 浅灰动画层，首页改成与内容行对应的短条。减少动画偏好下停止骨架动画。
- 实测首页及资源库 Skeleton 伪元素颜色为 rgb(250,251,252) / rgb(237,240,242)。
- 实测待确认翻页 1–4、5–8、9–11；切换待补齐/草稿后回到第一页；失败队列可访问第 5 条。CollectUI 最近编辑入口正常打开对应编辑器。
- 1440px、390px 实际截图检查；手机无横向溢出。2560px 下整体左右留白均为 436px。
- DOM 字体审计仍只有 12/14/20px 与 400/500。TypeScript、相关 ESLint、diff check 通过。未启动构建、AI 整理或保存内容。

## 2026-09-06 — 后台文字规范统一

- 字号仅 12 / 14 / 20px，分别用于辅助信息、正文与分区标题、页面标题与关键数字；字重仅 400 / 500。
- Mantine 主题统一字号和字重；原有 curator.css、workspace.css 的字号引用主题变量，清理局部 600/650/700 等字重。
- typography.css 处理门户弹窗、标签、表单说明与错误、Markdown 预览；CodeMirror 保留语法高亮，并把强调字重统一为 500。
- 浏览器 computed-style 审计：工作台、资源库、收录页、设置页、站点/技能/提示词编辑器，以及设置确认弹窗，文字字号和字重均符合规范。
- 临时 Markdown 样例覆盖标题、强调、列表、行内代码及代码块，编辑和预览都通过；已放弃修改，原始资源未保存或改写。
- 390px 手机检查：提示词收录、资源库、编辑器、设置页无横向溢出。确认弹窗仅打开检查后取消。
- 修复验证中发现的 MarkdownEditor 未提供正文时调用 trim 报错，空正文回退为空字符串。
- 验证：相关文件 ESLint、TypeScript noEmit、git diff --check 通过；未运行全量构建。

# Curator workspace redesign — 2026-09-06

Implemented the previously selected admin direction: 176px sidebar, neutral surfaces, compact operational UI, and restrained use of the existing accent. The frontend and resource data are outside this change.

## Scope

- Shared shell: sidebar navigation, editor routes correctly select Resources, mobile drawer, skip link, service status, public-site link and appearance popover.
- Dashboard: all five content types fit a single desktop summary row; actionable content issues expand by default; recent modifications are visible in a separate column.
- Resource library: one status filter, separate issues toggle, type tabs, search and sort. Removed duplicate status overview and normal-state result banner. Rows use title/summary and quiet status labels; slug/source remain in the link tooltip. Selection actions appear only after selection. Existing pagination and bulk operations remain wired.
- Editor: equal-height conversation and form panes on desktop; metadata, taxonomy and entry URLs are expandable, exposing content first. Validation opens the properties when needed. Discard restores content and clears validation feedback. Save remains explicit. Corrected the historical suggestion copy so it no longer says to save when content already matches.
- Ingest/settings: shared type scale and compact controls; improved mobile model selector and neutral prompt capture note. Preserved prompt-specific capture, model selection, confirmation and settings functions.

## Validation

- TypeScript no-emit and focused ESLint passed. Diff whitespace passed. No full build or unrelated tests.
- Desktop: 1440 × 900; resource library also checked at 1280 × 720. First row starts at approximately 247px and rows measure about 61px at the checked library state, compared with the earlier audit's roughly 480px first row.
- Checked live site filter (5 rows), CollectUI search (1 row), row selection and cancel, and editor navigation.
- Changed a summary locally and discarded it; state changed from 修改中 to 已保存. No resource was saved.
- Entered an invalid blank title and tried save: validation prevented persistence, reopened properties, and marked the field. Discard restored CollectUI and cleared validation. Desktop editor panes both measured 836px tall at 1440 × 900.
- Mobile: dashboard, resources, ingest, editor and settings at 390 × 844 all had document width 390px. Drawer navigation closes after selection. Prompt type switches to body/source capture. The mobile model selector was widened from about 94px to 192px.
- Appearance popover opens and Escape closes it. Browser warning/error check returned no entries.
- AI generation, actual resource persistence, publishing, bulk status mutations, configuration writes and build execution were not triggered by visual QA. Existing service errors and incomplete content were not modified.

## Screenshots

Directory: `/Users/wangwenyu/.codex/visualizations/2026/09/06/01a0740d-28d8-7da2-9998-4454ee237a4f/ai-resources-audit`

- `35-admin-dashboard.png`
- `36-admin-library.png`
- `37-admin-editor.png`
- `38-admin-library-mobile.png`
- `39-admin-ingest-mobile.png`
- `40-admin-dashboard-mobile.png`

Result: visual, navigation, selection and local form-state checks passed. Existing backend operations remain connected but were not re-executed as part of this UI task.
