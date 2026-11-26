# Wenworks AI 共用视觉规范

品牌：Wenworks AI。总入口 ai.wenworks.dev；三个站：模型 models.wenworks.dev、Agent 导航 agents.wenworks.dev、工具精选 tools.wenworks.dev。

## 颜色

- 背景 #ffffff；文字 #171717；次要文字 #525252
- 浅底/行悬停 #f5f5f5，更浅的块用 #fafafa
- 边框 #e5e5e5，悬停时 #d4d4d4；主色和焦点环 #171717
- 唯一强调色是橙色 #ec5b13，按强弱依次为 #f07f45 #f5a77a #f9c9ac #fde4d4
- 整站基本是黑、白、灰，橙色只用在最重要的地方（"新"标记、当前项）
- 不用渐变、玻璃质感、发光，也不做深色模式

## 字体

- 正文 IBM Plex Sans，中文回退到系统字体
- 数字和代码用 IBM Plex Mono，开启 tabular-nums
- 正文 16px，行高 1.5；次要信息 14px

## 形状与间距

- 控件和卡片都是直角；用 1px #e5e5e5 的线分隔，基本不用阴影
- 浮层用 0 8px 24px rgb(0 0 0 / 6%)
- 间距 0.25 / 0.5 / 1 / 1.5 / 2 / 3 rem；控件高度 2.75rem

## 动效

- 页头进场 360ms，内容淡入 460ms，缓动曲线 cubic-bezier(0.22, 1, 0.36, 1)
- 悬停时上移 1px，过渡 180ms
- 支持 prefers-reduced-motion

## 共用页头（三个站必须一模一样）

```
[Wenworks AI]   模型   Agent 导航   工具精选   |   本站栏目 …
```

- 高 3.5rem，白底，底部 1px #e5e5e5 边线
- "Wenworks AI" 字重 600，点击回到本站首页
- 当前所在的站加 aria-current="page"
- 链接默认是次要文字色，悬停或当前页时变成正文色并显示下划线（下划线从左向右展开）
- 手机宽度下，本站栏目收进菜单按钮，三个站点入口始终显示
- 样式在 `src/styles.css` 里"Wenworks AI 共用页头"一段，和三个站的仓库逐字相同，要改一起改

## 总入口的补充

- 总入口 ai.wenworks.dev 的页头没有本站栏目，所以也没有菜单按钮。
- "Wenworks AI" 指向 https://ai.wenworks.dev/ ，三个站点入口都不加 aria-current。
- 橙色只用在三处：一期简报顶部的 2px 线、"榜首更换"和"新"两个标记。
