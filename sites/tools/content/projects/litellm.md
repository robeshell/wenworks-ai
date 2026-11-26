---
{
  "id": "8a5a9aed-87d7-4092-86b2-46c7dd366b3e",
  "slug": "litellm",
  "blockType": "project",
  "title": "LiteLLM",
  "status": "active",
  "category": "gateway",
  "tags": [
    "self-host",
    "freemium",
    "web",
    "api"
  ],
  "sourceUrl": "https://www.litellm.ai/",
  "payload": {
    "summary": {
      "zh": "自托管网关，按 Key、团队、模型记账，超预算就停请求",
      "en": "Self-hosted gateway that tracks spend per key, team and model, and stops requests at budget."
    },
    "body": {
      "zh": "## 它是什么\n\nLiteLLM 是 Berrie AI 的开源 AI 网关，把 OpenAI、Anthropic、Vertex AI、Bedrock 等 140+ 提供商、1,800+ 模型收在一套 OpenAI 兼容 API 后面。它自带一个管理界面，用来发 Key、分团队、看花费和卡预算。团队不必再为每个模型各写一套 SDK、各管一份凭据。\n\n## 怎么运行\n\n最短路径是 Docker，两条命令就能跑起网关本体：\n\n```bash\ndocker pull docker.litellm.ai/berriai/litellm:latest\ndocker run -p 4000:4000 litellm\n```\n\n页面另给了 Helm chart 与 Terraform 模块、带数据库和非 root 的镜像变体；也可以接自己已有的 Postgres 和 Redis，用 Kubernetes 自动扩缩容，或部署在完全离线（air-gapped）的环境里。Rust 版网关在页面上也已上线。\n\n## 核心机制\n\n- **统一接口**：换模型只改网关配置，应用代码不动；新模型按 day-zero 跟进。\n- **记账与硬预算**：用量和花费按 Key、用户、团队、组织、模型、MCP 归集，预算按日/月重置，到顶请求直接停；Key 上还能设 TPM/RPM 与泄漏保护。\n- **路由降本**：跨提供商、区域、Key 做负载均衡，走最低成本部署，简单问题自动丢给便宜模型，再叠语义缓存（Redis/S3/GCS）与 prompt 压缩。\n- **护栏与审计**：PII 脱敏、prompt 注入、密钥检测等 guardrail 按 pre-call / during-call / post-call 执行，每次请求进审计日志。\n- **不止 LLM**：MCP server 与 agent 走同一个网关、同一个 Key。\n\n## 适合谁\n\n一是平台团队要把模型访问铺给全公司，又不想每次都过采购和安全评审；二是要在多家提供商之间切换、把 AI 花费分摊到各业务线的团队。\n\n## 使用边界\n\n开源核心是 MIT 许可，自托管要自己管 Postgres 和 Redis（或选带数据库的镜像）。SSO、RBAC、审计日志、SCIM、SLA 属于 Enterprise 付费部分，不是另一套内核。性能数字来自厂商自己的 AI Gateway Bench：p99 额外延迟 0.66 ms。",
      "en": "## What it is\n\nLiteLLM is Berrie AI's open-source AI gateway that puts OpenAI, Anthropic, Vertex AI, Bedrock and 140+ other providers and 1,800+ models behind a single OpenAI-compatible API. It ships with an admin UI for issuing keys, splitting teams, watching spend and capping budgets. Teams no longer need a separate SDK and a separate set of credentials for every model.\n\n## How it runs\n\nThe shortest path is Docker — two commands bring up the gateway itself:\n\n```bash\ndocker pull docker.litellm.ai/berriai/litellm:latest\ndocker run -p 4000:4000 litellm\n```\n\nThe page also offers a Helm chart and a Terraform module, plus database-bundled and non-root image variants; you can connect your own Postgres and Redis, autoscale with Kubernetes, or deploy in a fully air-gapped environment. The Rust gateway is live on the page as well.\n\n## Core mechanics\n\n- **Unified interface**: swapping models only changes gateway configuration, application code stays put; new models are picked up day-zero.\n- **Accounting and hard budgets**: usage and spend are attributed by key, user, team, org, model and MCP; budgets reset daily or monthly and requests stop once the cap is hit; keys can also carry TPM/RPM limits and leaked-key protection.\n- **Routing for lower cost**: load balancing across providers, regions and keys, lowest-cost deployment routing, Auto Routing that sends simple prompts to cheaper models, plus semantic caching (Redis/S3/GCS) and prompt compression.\n- **Guardrails and audit**: PII masking, prompt injection, secret detection and other guardrails run at pre-call / during-call / post-call, and every request lands in an audit log.\n- **More than LLMs**: MCP servers and agents go through the same gateway and the same key.\n\n## Who it is for\n\nFirst, platform teams that want to spread model access across the whole company without every step going through procurement and security review; second, teams that switch between several providers and need to charge AI spend back to each business line.\n\n## Boundaries\n\nThe open-source core is MIT-licensed, and self-hosting means running your own Postgres and Redis (or choosing the database-bundled image). SSO, RBAC, audit logs, SCIM and SLA belong to the paid Enterprise offering, not to a different core. The performance numbers come from the vendor's own AI Gateway Bench: 0.66 ms added p99 latency."
    },
    "links": [
      {
        "label": "litellm.ai",
        "url": "https://www.litellm.ai/",
        "kind": "official"
      }
    ],
    "cover": "/covers/8a5a9aed-87d7-4092-86b2-46c7dd366b3e-b5d35da03c.webp"
  }
}
---

## 它是什么

LiteLLM 是 Berrie AI 的开源 AI 网关，把 OpenAI、Anthropic、Vertex AI、Bedrock 等 140+ 提供商、1,800+ 模型收在一套 OpenAI 兼容 API 后面。它自带一个管理界面，用来发 Key、分团队、看花费和卡预算。团队不必再为每个模型各写一套 SDK、各管一份凭据。

## 怎么运行

最短路径是 Docker，两条命令就能跑起网关本体：

```bash
docker pull docker.litellm.ai/berriai/litellm:latest
docker run -p 4000:4000 litellm
```

页面另给了 Helm chart 与 Terraform 模块、带数据库和非 root 的镜像变体；也可以接自己已有的 Postgres 和 Redis，用 Kubernetes 自动扩缩容，或部署在完全离线（air-gapped）的环境里。Rust 版网关在页面上也已上线。

## 核心机制

- **统一接口**：换模型只改网关配置，应用代码不动；新模型按 day-zero 跟进。
- **记账与硬预算**：用量和花费按 Key、用户、团队、组织、模型、MCP 归集，预算按日/月重置，到顶请求直接停；Key 上还能设 TPM/RPM 与泄漏保护。
- **路由降本**：跨提供商、区域、Key 做负载均衡，走最低成本部署，简单问题自动丢给便宜模型，再叠语义缓存（Redis/S3/GCS）与 prompt 压缩。
- **护栏与审计**：PII 脱敏、prompt 注入、密钥检测等 guardrail 按 pre-call / during-call / post-call 执行，每次请求进审计日志。
- **不止 LLM**：MCP server 与 agent 走同一个网关、同一个 Key。

## 适合谁

一是平台团队要把模型访问铺给全公司，又不想每次都过采购和安全评审；二是要在多家提供商之间切换、把 AI 花费分摊到各业务线的团队。

## 使用边界

开源核心是 MIT 许可，自托管要自己管 Postgres 和 Redis（或选带数据库的镜像）。SSO、RBAC、审计日志、SCIM、SLA 属于 Enterprise 付费部分，不是另一套内核。性能数字来自厂商自己的 AI Gateway Bench：p99 额外延迟 0.66 ms。
