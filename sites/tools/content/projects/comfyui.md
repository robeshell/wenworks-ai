---
{
  "id": "comfyui",
  "slug": "comfyui",
  "blockType": "project",
  "title": "ComfyUI",
  "status": "active",
  "category": "automation",
  "tags": [
    "self-host",
    "free",
    "app",
    "api"
  ],
  "sourceUrl": "https://github.com/Comfy-Org/ComfyUI",
  "payload": {
    "summary": {
      "zh": "用节点编排本地生成流程，只重跑发生变化的分支。",
      "en": "Build local media pipelines as node graphs, rerunning only changed branches while retaining API access."
    },
    "body": {
      "zh": "## 它是什么\n\n在 ComfyUI 里，一次典型生成不是只填一个提示框，而是把模型、提示词、采样器、ControlNet、放大和输出节点连接起来，再提交整张节点图。系统按数据流执行各环节，生成结果；修改某个参数后再次提交，只重新计算受影响的部分。工作流可以保存为 JSON，也能从带有元数据的生成文件中恢复。\n\nComfyUI 是采用 GPL-3.0 许可、在本地运行的 AI 内容生成引擎。它与常见的单提示框工具相比，实际区别在于每个处理步骤都可见、可替换，能够检查中间结果并固定处理顺序，更适合反复运行和调整复杂流程。\n\n## 怎么运行\n\nWindows 或 macOS 用户可以安装桌面版，Windows 也提供便携包。使用官方命令行安装器时，执行：\n\n```bash\npip install comfy-cli\ncomfy install\n```\n\n手动安装需要克隆仓库、安装 `requirements.txt` 中的依赖，将模型放入对应目录，然后运行 `python main.py`。Linux、Apple Silicon 以及多类 GPU 分别有相应的安装路径。\n\n## 核心机制\n\n- **节点工作流**：把图像、视频、音频、3D 和文本处理拆成可连接的节点，也可组合子图与模板；App Mode 能收起复杂节点图。\n- **增量执行**：异步队列只执行输入完整且确实需要计算的部分，未发生变化的分支不会在再次提交时重复运行。\n- **资源调度**：通过显存与内存管理、模型卸载和量化模型支持，让较复杂的模型链能够在本机执行。\n- **扩展与接入**：自定义节点可以增加模型或处理步骤，本地 API 可将已有工作流接入其他应用。\n\n## 适合谁\n\n它适合需要控制模型、参数和处理顺序的视觉创作者，也适合将稳定生成流程嵌入内部工具的技术团队。如果任务经常需要替换局部模型、查看中间结果或重复执行固定步骤，节点图会比单个提示框更便于维护。\n\n## 使用边界\n\n本地运行需要自行准备模型、Python 和合适的硬件环境。工作流越复杂，节点依赖与版本维护成本通常越高，开发分支也可能使部分自定义节点失效。核心可完全离线运行；Comfy API 节点和 Comfy Cloud 是可选付费部分，可通过 `--disable-api-nodes` 禁用外部 API 节点。",
      "en": "## What it is\n\nIn ComfyUI, a typical generation is not just filling in a single prompt box; instead you connect model, prompt, sampler, ControlNet, upscaling, and output nodes, then submit the whole node graph. The system executes each stage along the data flow and produces the result; after changing a parameter and submitting again, only the affected parts are recomputed. Workflows can be saved as JSON, and can also be restored from generated files that carry metadata.\n\nComfyUI is an AI content generation engine licensed under GPL-3.0 that runs locally. Compared with common single-prompt-box tools, the practical difference is that every processing step is visible and replaceable, intermediate results can be inspected, and the processing order can be fixed, which makes it better suited to repeatedly running and adjusting complex pipelines.\n\n## How to run\n\nWindows or macOS users can install the desktop version, and Windows also offers a portable package. When using the official command-line installer, run:\n\n```bash\npip install comfy-cli\ncomfy install\n```\n\nManual installation requires cloning the repository, installing the dependencies in `requirements.txt`, placing models in the corresponding directories, and then running `python main.py`. Linux, Apple Silicon, and various GPU types each have their own installation path.\n\n## Core mechanics\n\n- **Node workflows**: image, video, audio, 3D, and text processing is broken into connectable nodes, and subgraphs and templates can be composed as well; App Mode can collapse a complex node graph.\n- **Incremental execution**: the asynchronous queue only executes the parts whose inputs are complete and that actually need computing, and branches that have not changed are not re-run on a subsequent submission.\n- **Resource scheduling**: through VRAM and memory management, model offloading, and support for quantized models, more complex model chains can run on the local machine.\n- **Extensions and integration**: custom nodes can add models or processing steps, and the local API can connect existing workflows into other applications.\n\n## Who it is for\n\nIt suits visual creators who need control over models, parameters, and processing order, and also technical teams embedding stable generation pipelines into internal tools. If tasks frequently require swapping out individual models in the chain, inspecting intermediate results, or repeatedly executing fixed steps, a node graph is easier to maintain than a single prompt box.\n\n## Usage boundaries\n\nRunning locally requires preparing your own models, Python, and suitable hardware. The more complex a workflow becomes, the higher the cost of maintaining node dependencies and versions usually is, and development branches may also break some custom nodes. The core can run fully offline; Comfy API nodes and Comfy Cloud are optional paid parts, and external API nodes can be disabled with `--disable-api-nodes`."
    },
    "links": [
      {
        "label": "GitHub Repository",
        "url": "https://github.com/Comfy-Org/ComfyUI",
        "kind": "repository"
      },
      {
        "label": "Documentation",
        "url": "https://docs.comfy.org/",
        "kind": "docs"
      },
      {
        "label": "Official Website",
        "url": "https://www.comfy.org/",
        "kind": "official"
      }
    ],
    "cover": "/covers/comfyui-8c4dbd527a.webp"
  }
}
---

## 它是什么

在 ComfyUI 里，一次典型生成不是只填一个提示框，而是把模型、提示词、采样器、ControlNet、放大和输出节点连接起来，再提交整张节点图。系统按数据流执行各环节，生成结果；修改某个参数后再次提交，只重新计算受影响的部分。工作流可以保存为 JSON，也能从带有元数据的生成文件中恢复。

ComfyUI 是采用 GPL-3.0 许可、在本地运行的 AI 内容生成引擎。它与常见的单提示框工具相比，实际区别在于每个处理步骤都可见、可替换，能够检查中间结果并固定处理顺序，更适合反复运行和调整复杂流程。

## 怎么运行

Windows 或 macOS 用户可以安装桌面版，Windows 也提供便携包。使用官方命令行安装器时，执行：

```bash
pip install comfy-cli
comfy install
```

手动安装需要克隆仓库、安装 `requirements.txt` 中的依赖，将模型放入对应目录，然后运行 `python main.py`。Linux、Apple Silicon 以及多类 GPU 分别有相应的安装路径。

## 核心机制

- **节点工作流**：把图像、视频、音频、3D 和文本处理拆成可连接的节点，也可组合子图与模板；App Mode 能收起复杂节点图。
- **增量执行**：异步队列只执行输入完整且确实需要计算的部分，未发生变化的分支不会在再次提交时重复运行。
- **资源调度**：通过显存与内存管理、模型卸载和量化模型支持，让较复杂的模型链能够在本机执行。
- **扩展与接入**：自定义节点可以增加模型或处理步骤，本地 API 可将已有工作流接入其他应用。

## 适合谁

它适合需要控制模型、参数和处理顺序的视觉创作者，也适合将稳定生成流程嵌入内部工具的技术团队。如果任务经常需要替换局部模型、查看中间结果或重复执行固定步骤，节点图会比单个提示框更便于维护。

## 使用边界

本地运行需要自行准备模型、Python 和合适的硬件环境。工作流越复杂，节点依赖与版本维护成本通常越高，开发分支也可能使部分自定义节点失效。核心可完全离线运行；Comfy API 节点和 Comfy Cloud 是可选付费部分，可通过 `--disable-api-nodes` 禁用外部 API 节点。
