---
{
  "id": "open-webui",
  "slug": "open-webui",
  "blockType": "project",
  "title": "Open WebUI",
  "status": "active",
  "category": "workbench",
  "tags": [
    "self-host",
    "web"
  ],
  "sourceUrl": "https://github.com/open-webui/open-webui",
  "payload": {
    "summary": {
      "zh": "自托管聊天界面，接入 Ollama、兼容 API 与本地 RAG",
      "en": "Run a self-hosted chat UI with Ollama, OpenAI-compatible APIs, local RAG, and optional offline operation."
    },
    "body": {
      "zh": "## 它是什么\n\nOpen WebUI 是一个可自行部署的 AI 对话平台。用户打开浏览器，选择已经接入的 Ollama、本地模型或 OpenAI 兼容 API，发送问题后，平台会把请求交给对应模型，并保存对话；需要处理资料时，还可以将文档或网页内容检索出来，带入当前对话。\n\n它和分别使用 Ollama 界面、不同厂商网页或单独编写 API 客户端的区别，在于把模型、用户、权限、记忆、知识库和扩展集中到同一套界面中。管理员可以控制谁能访问哪些模型、知识库与工具，用户也能在一次对话中使用本地和远程模型。\n\n## 怎么运行\n\n在 Python 3.11 环境中安装并启动：\n\n```bash\npip install open-webui\nopen-webui serve\n```\n\n启动后访问 `http://localhost:8080`。也可以运行官方 Docker 镜像；部署时必须挂载 `/app/backend/data`，否则重建容器时可能丢失数据库。\n\n## 核心机制\n\n- **统一模型入口**：同时连接 Ollama 与 OpenAI 兼容接口，在一个界面中混用本地和远程模型。\n- **内置 RAG**：通过向量数据库、内容提取器、混合检索与重排，从文档或网页中找出相关内容并加入对话。\n- **扩展体系**：Filters、Actions、Pipes、Tools 和 Skills 可调整消息流程或连接外部服务，也能接入 MCP 与 OpenAPI 工具服务器。\n- **多用户治理**：使用角色、用户组和细粒度权限，限制模型、知识库及扩展的访问范围。\n\n## 适合谁\n\n适合希望为个人或团队建立统一 LLM 聊天入口的人，也适合需要集中管理本地 Ollama、企业 API、文档库和身份系统的管理员。简单部署可使用 SQLite；规模化环境可配合 PostgreSQL、对象存储、Redis 和多节点能力。\n\n## 使用边界\n\n离线运行前，需要把模型、嵌入模型及相关资源准备在本地，并设置 `HF_HUB_OFFLINE=1`。连接云端 API、搜索服务或外部存储时仍需要网络。\n\n当前代码包含多种许可。Open WebUI License 要求保留“Open WebUI”品牌；定制品牌、SLA 和 LTS 等能力属于 Enterprise Plan。部署或修改前，应核对 `LICENSE` 与 `LICENSE_HISTORY`。",
      "en": "## What it is\n\nOpen WebUI is an AI chat platform you can deploy yourself. Users open a browser, pick a connected Ollama, local model, or OpenAI-compatible API, and after sending a question the platform passes the request to the corresponding model and saves the conversation; when documents need to be handled, document or web page content can also be retrieved and brought into the current conversation.\n\nWhat sets it apart from using the Ollama interface, different vendors' web pages, or writing a separate API client is that it brings models, users, permissions, memory, knowledge bases, and extensions together in one interface. Administrators can control who has access to which models, knowledge bases, and tools, while users can use local and remote models within a single conversation.\n\n## How to run\n\nInstall and start it in a Python 3.11 environment:\n\n```bash\npip install open-webui\nopen-webui serve\n```\n\nAfter starting, visit `http://localhost:8080`. You can also run the official Docker image; when deploying, `/app/backend/data` must be mounted, otherwise the database may be lost when the container is rebuilt.\n\n## Core mechanisms\n\n- **Unified model entry point**: connects to Ollama and OpenAI-compatible interfaces at the same time, mixing local and remote models in one interface.\n- **Built-in RAG**: through a vector database, content extractors, hybrid retrieval, and reranking, it finds relevant content from documents or web pages and adds it to the conversation.\n- **Extension system**: Filters, Actions, Pipes, Tools, and Skills can adjust the message flow or connect external services, and can also connect to MCP and OpenAPI tool servers.\n- **Multi-user governance**: uses roles, user groups, and fine-grained permissions to limit access to models, knowledge bases, and extensions.\n\n## Who it's for\n\nIt suits people who want to build a unified LLM chat entry point for themselves or their team, and administrators who need to centrally manage local Ollama, enterprise APIs, document libraries, and identity systems. Simple deployments can use SQLite; at scale, it can work with PostgreSQL, object storage, Redis, and multi-node capabilities.\n\n## Usage boundaries\n\nBefore running offline, you need to prepare the models, embedding models, and related resources locally and set `HF_HUB_OFFLINE=1`. Network access is still needed when connecting to cloud APIs, search services, or external storage.\n\nThe current code includes multiple licenses. The Open WebUI License requires keeping the \"Open WebUI\" branding; capabilities such as custom branding, SLA, and LTS are part of the Enterprise Plan. Before deploying or modifying, check `LICENSE` and `LICENSE_HISTORY`."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/open-webui/open-webui",
        "kind": "repository"
      },
      {
        "label": "Documentation",
        "url": "https://docs.openwebui.com/",
        "kind": "docs"
      },
      {
        "label": "Website",
        "url": "https://openwebui.com/",
        "kind": "official"
      }
    ],
    "cover": "/covers/open-webui-f441e04917.webp"
  }
}
---

## 它是什么

Open WebUI 是一个可自行部署的 AI 对话平台。用户打开浏览器，选择已经接入的 Ollama、本地模型或 OpenAI 兼容 API，发送问题后，平台会把请求交给对应模型，并保存对话；需要处理资料时，还可以将文档或网页内容检索出来，带入当前对话。

它和分别使用 Ollama 界面、不同厂商网页或单独编写 API 客户端的区别，在于把模型、用户、权限、记忆、知识库和扩展集中到同一套界面中。管理员可以控制谁能访问哪些模型、知识库与工具，用户也能在一次对话中使用本地和远程模型。

## 怎么运行

在 Python 3.11 环境中安装并启动：

```bash
pip install open-webui
open-webui serve
```

启动后访问 `http://localhost:8080`。也可以运行官方 Docker 镜像；部署时必须挂载 `/app/backend/data`，否则重建容器时可能丢失数据库。

## 核心机制

- **统一模型入口**：同时连接 Ollama 与 OpenAI 兼容接口，在一个界面中混用本地和远程模型。
- **内置 RAG**：通过向量数据库、内容提取器、混合检索与重排，从文档或网页中找出相关内容并加入对话。
- **扩展体系**：Filters、Actions、Pipes、Tools 和 Skills 可调整消息流程或连接外部服务，也能接入 MCP 与 OpenAPI 工具服务器。
- **多用户治理**：使用角色、用户组和细粒度权限，限制模型、知识库及扩展的访问范围。

## 适合谁

适合希望为个人或团队建立统一 LLM 聊天入口的人，也适合需要集中管理本地 Ollama、企业 API、文档库和身份系统的管理员。简单部署可使用 SQLite；规模化环境可配合 PostgreSQL、对象存储、Redis 和多节点能力。

## 使用边界

离线运行前，需要把模型、嵌入模型及相关资源准备在本地，并设置 `HF_HUB_OFFLINE=1`。连接云端 API、搜索服务或外部存储时仍需要网络。

当前代码包含多种许可。Open WebUI License 要求保留“Open WebUI”品牌；定制品牌、SLA 和 LTS 等能力属于 Enterprise Plan。部署或修改前，应核对 `LICENSE` 与 `LICENSE_HISTORY`。
