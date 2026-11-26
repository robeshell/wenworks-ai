---
{
  "id": "ragflow",
  "slug": "ragflow",
  "blockType": "project",
  "title": "RAGFlow",
  "status": "active",
  "category": "memory",
  "tags": [
    "self-host",
    "china",
    "free",
    "web",
    "api"
  ],
  "sourceUrl": "https://github.com/infiniflow/ragflow",
  "payload": {
    "summary": {
      "zh": "解析复杂文档并融合重排，答案可追溯；自托管资源要求较高",
      "en": "Parses mixed-format documents, retrieves with reranking, and returns cited answers; self-hosting needs substantial resources."
    },
    "body": {
      "zh": "## 它是什么\n\nRAGFlow 是一套开源 RAG 引擎，用来把 Word、Slides、Excel、扫描件、图片、网页和结构化数据接入 AI 问答。一次典型操作是上传资料，选择解析与切片方式，检查系统生成的知识片段，再让模型检索相关内容、重排结果并生成带来源引用的回答。\n\n与只提供聊天界面或简单向量检索的方案相比，RAGFlow 把复杂文档解析、知识切片、检索重排、引用溯源和 Agent 工作流放在同一套系统中。操作者可以直接查看切片并修正解析结果，适合对知识边界和回答出处有检查要求的生产场景。\n\n## 怎么运行\n\n最短路径是拉取仓库，切换到指定版本，再用预构建镜像启动 Docker Compose 服务：\n\n```bash\ngit clone https://github.com/infiniflow/ragflow.git\ncd ragflow/docker\ngit checkout v0.27.1\ndocker compose -f docker-compose.yml up -d\ndocker logs -f docker-ragflow-cpu-1\n```\n\n服务初始化完成后，在浏览器访问服务器地址。随后还要在配置中选择 LLM 厂商，并填写对应的 API Key。\n\n## 核心机制\n\n- **深度文档解析**：从版式复杂的非结构化材料中抽取知识，也可借助多模态模型理解 PDF 或 DOCX 内的图片。\n- **模板化切片**：根据材料类型选择切片模板，并将结果可视化，便于人工调整知识边界。\n- **融合检索**：组合多路召回与重排，把关键引用附在回答中，方便回到原始材料核对。\n- **可编排流程**：摄取管线、RAG 工作流和 Agent 模板均可配置，业务系统也能通过 API 接入。\n\n## 适合谁\n\n适合需要把合同、报告、表格和扫描材料等异构资料接入内部问答的团队，特别是必须检查切片质量和回答出处的场景。它也可以作为自建 AI 应用的检索与上下文层，而不只是一个聊天界面。\n\n## 使用边界\n\n仓库采用 Apache-2.0 许可。自托管最低要求为 4 核 CPU、16 GB 内存、50 GB 磁盘，并依赖 Docker 24、Docker Compose 2.26.1 及 Python 3.13。预构建镜像面向 x86，ARM64 需要自行构建。系统默认使用 Elasticsearch 保存全文和向量，也可切换 Infinity。所选 LLM 与嵌入服务仍需单独配置，代码执行沙箱还额外依赖 gVisor。",
      "en": "## What it is\n\nRAGFlow is an open-source RAG engine that connects Word, Slides, Excel, scans, images, web pages and structured data to AI question answering. A typical operation is to upload material, choose a parsing and chunking method, review the knowledge chunks the system generates, and then let the model retrieve the relevant content, rerank the results and generate answers with source citations.\n\nCompared with solutions that only offer a chat interface or simple vector retrieval, RAGFlow puts complex document parsing, knowledge chunking, retrieval reranking, citation tracing and Agent workflows into one system. Operators can inspect chunks directly and correct parsing results, which suits production scenarios that require checking knowledge boundaries and answer provenance.\n\n## How to run it\n\nThe shortest path is to clone the repository, switch to a specified version, and then start the Docker Compose services with prebuilt images:\n\n```bash\ngit clone https://github.com/infiniflow/ragflow.git\ncd ragflow/docker\ngit checkout v0.27.1\ndocker compose -f docker-compose.yml up -d\ndocker logs -f docker-ragflow-cpu-1\n```\n\nAfter the service finishes initializing, visit the server address in a browser. Then you still need to select an LLM vendor in the configuration and fill in the corresponding API Key.\n\n## Core mechanisms\n\n- **Deep document parsing**: extracts knowledge from unstructured material with complex layouts, and can also use multimodal models to understand images inside PDFs or DOCX files.\n- **Template-based chunking**: choose a chunking template according to the material type, and visualize the results so that knowledge boundaries can be adjusted by hand.\n- **Fusion retrieval**: combines multiple recall routes with reranking and attaches key citations to the answer, making it easy to go back to the original material and verify.\n- **Orchestratable pipelines**: ingestion pipelines, RAG workflows and Agent templates are all configurable, and business systems can also integrate through the API.\n\n## Who it is for\n\nIt suits teams that need to connect heterogeneous material such as contracts, reports, tables and scanned documents to internal question answering, especially scenarios where chunk quality and answer provenance must be checked. It can also serve as the retrieval and context layer of a self-built AI application, rather than just a chat interface.\n\n## Usage boundaries\n\nThe repository uses the Apache-2.0 license. The minimum self-hosting requirement is 4 CPU cores, 16 GB memory and 50 GB disk, and it depends on Docker 24, Docker Compose 2.26.1 and Python 3.13. The prebuilt images target x86, and ARM64 requires building them yourself. By default the system uses Elasticsearch to store full text and vectors, and it can also switch to Infinity. The chosen LLM and embedding service still need to be configured separately, and the code execution sandbox additionally depends on gVisor."
    },
    "links": [
      {
        "label": "GitHub repository",
        "url": "https://github.com/infiniflow/ragflow",
        "kind": "repository"
      },
      {
        "label": "Documentation",
        "url": "https://ragflow.io/docs",
        "kind": "docs"
      },
      {
        "label": "Official website",
        "url": "https://ragflow.io/",
        "kind": "official"
      }
    ],
    "cover": "/covers/ragflow-a3d8f2a178.webp"
  }
}
---

## 它是什么

RAGFlow 是一套开源 RAG 引擎，用来把 Word、Slides、Excel、扫描件、图片、网页和结构化数据接入 AI 问答。一次典型操作是上传资料，选择解析与切片方式，检查系统生成的知识片段，再让模型检索相关内容、重排结果并生成带来源引用的回答。

与只提供聊天界面或简单向量检索的方案相比，RAGFlow 把复杂文档解析、知识切片、检索重排、引用溯源和 Agent 工作流放在同一套系统中。操作者可以直接查看切片并修正解析结果，适合对知识边界和回答出处有检查要求的生产场景。

## 怎么运行

最短路径是拉取仓库，切换到指定版本，再用预构建镜像启动 Docker Compose 服务：

```bash
git clone https://github.com/infiniflow/ragflow.git
cd ragflow/docker
git checkout v0.27.1
docker compose -f docker-compose.yml up -d
docker logs -f docker-ragflow-cpu-1
```

服务初始化完成后，在浏览器访问服务器地址。随后还要在配置中选择 LLM 厂商，并填写对应的 API Key。

## 核心机制

- **深度文档解析**：从版式复杂的非结构化材料中抽取知识，也可借助多模态模型理解 PDF 或 DOCX 内的图片。
- **模板化切片**：根据材料类型选择切片模板，并将结果可视化，便于人工调整知识边界。
- **融合检索**：组合多路召回与重排，把关键引用附在回答中，方便回到原始材料核对。
- **可编排流程**：摄取管线、RAG 工作流和 Agent 模板均可配置，业务系统也能通过 API 接入。

## 适合谁

适合需要把合同、报告、表格和扫描材料等异构资料接入内部问答的团队，特别是必须检查切片质量和回答出处的场景。它也可以作为自建 AI 应用的检索与上下文层，而不只是一个聊天界面。

## 使用边界

仓库采用 Apache-2.0 许可。自托管最低要求为 4 核 CPU、16 GB 内存、50 GB 磁盘，并依赖 Docker 24、Docker Compose 2.26.1 及 Python 3.13。预构建镜像面向 x86，ARM64 需要自行构建。系统默认使用 Elasticsearch 保存全文和向量，也可切换 Infinity。所选 LLM 与嵌入服务仍需单独配置，代码执行沙箱还额外依赖 gVisor。
