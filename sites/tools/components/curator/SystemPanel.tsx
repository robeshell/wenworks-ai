"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Autocomplete, Button, Modal, NumberInput, PasswordInput, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { curatorRequest, type AgentInfo, type BuildJob, type PiProjectConfig } from "@/lib/curator-client";
import { useBuildJob } from "@/components/curator/useBuildJob";

const BUILD_LABEL: Record<string, string> = { running: "检查中…", ok: "上次检查通过", error: "上次检查失败", idle: "" };

/**
 * Settings is one thing: which AI the assistant talks to. Token limits and
 * the build check are rarely touched, so they sit under 高级.
 */
export function SystemPanel() {
  const [piConfig, setPiConfig] = useState<PiProjectConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [gatewayModels, setGatewayModels] = useState<Array<{ value: string; label: string }>>([]);
  const [contextWindow, setContextWindow] = useState<number | string>(128000);
  const [maxTokens, setMaxTokens] = useState<number | string>(8192);
  const { build, setBuild } = useBuildJob();
  const [busy, setBusy] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const modelOptions = (tools?: AgentInfo[]) => (tools?.[0]?.models || []).map((model) => ({ value: model.id, label: model.label }));

  useEffect(() => {
    Promise.all([
      curatorRequest<{ tools: AgentInfo[]; build?: BuildJob }>("/health"),
      curatorRequest<PiProjectConfig>("/pi-config"),
      curatorRequest<BuildJob>("/build").catch(() => ({ status: "idle" as const })),
    ]).then(([health, config, buildData]) => {
      setGatewayModels(modelOptions(health.tools));
      setPiConfig(config);
      setBaseUrl(config.baseUrl);
      setDefaultModel(config.defaultModel);
      setContextWindow(config.contextWindow);
      setMaxTokens(config.maxTokens);
      setBuild(buildData || health.build || { status: "idle" });
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "无法读取设置"));
  }, [setBuild]);

  const body = () => JSON.stringify({ baseUrl, apiKey, defaultModel, contextWindow, maxTokens });
  const canTest = Boolean(baseUrl && defaultModel && (apiKey || piConfig?.hasApiKey));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfigBusy(true);
    try {
      const saved = await curatorRequest<PiProjectConfig & { message: string; agents: { tools: AgentInfo[] } }>("/pi-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: body() });
      setPiConfig(saved); setApiKey(""); setGatewayModels(modelOptions(saved.agents.tools)); setError(null);
      notifications.show({ message: "已保存", color: "curator" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败"); }
    finally { setConfigBusy(false); }
  }

  async function test() {
    setConfigBusy(true);
    try {
      const result = await curatorRequest<{ message: string }>("/pi-config/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: body() });
      setError(null); notifications.show({ message: result.message, color: "curator" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "连接测试失败"); }
    finally { setConfigBusy(false); }
  }

  async function loadModels() {
    setConfigBusy(true);
    try {
      const result = await curatorRequest<{ message: string; models: AgentInfo["models"] }>("/pi-config/models", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey, defaultModel: defaultModel || "model-list", contextWindow, maxTokens }),
      });
      const options = result.models.map((model) => ({ value: model.id, label: model.label }));
      setGatewayModels(options);
      if (!defaultModel && options[0]) setDefaultModel(options[0].value);
      setError(null); notifications.show({ message: result.message, color: "curator" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "模型列表读取失败"); }
    finally { setConfigBusy(false); }
  }

  async function clear() {
    setClearOpen(false); setConfigBusy(true);
    try {
      const cleared = await curatorRequest<PiProjectConfig & { message: string }>("/pi-config", { method: "DELETE" });
      setPiConfig(cleared); setBaseUrl(""); setApiKey(""); setDefaultModel("");
      setContextWindow(cleared.contextWindow); setMaxTokens(cleared.maxTokens); setError(null);
      notifications.show({ message: cleared.message, color: "curator" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "清除失败"); }
    finally { setConfigBusy(false); }
  }

  async function runBuildCheck() {
    setBusy(true);
    try { setBuild(await curatorRequest<BuildJob>("/build", { method: "POST" })); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "构建检查没有开始"); }
    finally { setBusy(false); }
  }

  return <section className="settings">
    <h1>设置</h1>
    {error ? <Alert color="red" role="alert" withCloseButton onClose={() => setError(null)}>{error}</Alert> : null}

    <form className="settings-block" onSubmit={save}>
      <header>
        <h2>AI 连接</h2>
        <span className="settings-state" data-on={piConfig?.configured || undefined}>{piConfig ? (piConfig.configured ? `已连接 · ${piConfig.defaultModel}` : "未连接") : ""}</span>
      </header>
      <p className="settings-note">AI 助手和收录整理都用这里的连接。只保存在本项目的 <code>.curator/</code>，不会读电脑上别的 AI 配置。</p>
      <TextInput required label="网关地址" description="兼容 Anthropic Messages 的地址" value={baseUrl} onChange={(event) => setBaseUrl(event.currentTarget.value)} placeholder="https://gateway.example.com" autoComplete="off" />
      <PasswordInput required={!piConfig?.hasApiKey} label="API Key" description={piConfig?.hasApiKey ? `已保存 ${piConfig.apiKeyHint}，留空不修改` : undefined} value={apiKey} onChange={(event) => setApiKey(event.currentTarget.value)} placeholder={piConfig?.hasApiKey ? "留空表示不修改" : "输入 API Key"} autoComplete="new-password" />
      <div className="settings-model">
        <Autocomplete required label="模型" value={defaultModel} onChange={setDefaultModel} data={gatewayModels} placeholder="输入名称，或从网关拉取" autoComplete="off" />
        <Button type="button" variant="default" disabled={configBusy || !baseUrl || (!apiKey && !piConfig?.hasApiKey)} onClick={() => void loadModels()}>拉取模型</Button>
      </div>
      <div className="settings-actions">
        <Button type="submit" loading={configBusy}>保存</Button>
        <Button type="button" variant="default" disabled={configBusy || !canTest} onClick={() => void test()}>测试连接</Button>
      </div>
    </form>

    <details className="settings-advanced">
      <summary>高级</summary>
      <div className="settings-advanced-body">
        <div className="settings-pair">
          <NumberInput min={1} allowDecimal={false} label="上下文窗口" value={contextWindow} onChange={setContextWindow} />
          <NumberInput min={1} allowDecimal={false} label="最大输出 Token" value={maxTokens} onChange={setMaxTokens} />
        </div>
        <p className="settings-note">改完点上面的「保存」生效。</p>

        <div className="settings-row">
          <div><b>构建检查</b><span>完整跑一次静态导出，确认公开站能生成。「上线」前一般不需要。</span></div>
          <Button size="xs" variant="default" loading={busy || build.status === "running"} onClick={() => void runBuildCheck()}>运行</Button>
        </div>
        {build.status !== "idle" ? <p className="settings-build" data-status={build.status}>{BUILD_LABEL[build.status] || build.status}</p> : null}
        {build.error ? <Alert color="red">{build.error}</Alert> : null}
        {build.log?.trim() ? <details className="settings-log"><summary>构建日志</summary><pre className="curator-code-block">{build.log.trim()}</pre></details> : null}

        {piConfig?.configured ? <div className="settings-row">
          <div><b>清除 AI 连接</b><span>删除本项目保存的网关地址和 Key。</span></div>
          <Button size="xs" variant="subtle" color="red" disabled={configBusy} onClick={() => setClearOpen(true)}>清除</Button>
        </div> : null}
      </div>
    </details>

    <Modal opened={clearOpen} onClose={() => setClearOpen(false)} title="清除 AI 连接？" centered size={420}>
      <p className="settings-note">清除后 AI 助手和收录整理都会停用，重新填写即可恢复。</p>
      <div className="ship-actions"><Button variant="default" onClick={() => setClearOpen(false)}>取消</Button><Button color="red" loading={configBusy} onClick={() => void clear()}>清除</Button></div>
    </Modal>
  </section>;
}
