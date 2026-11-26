"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Modal } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { curatorRequest } from "@/lib/curator-client";

type ShipStatus = { changed: number; titles: string[]; images: number; lists: number; lastPublishedAt: string };
type ShipResult = { commit: string; titles: string[]; images: number; lists: number; deployUrl: string };

/** Other screens announce local publishes so the count updates immediately. */
export const SHIP_REFRESH_EVENT = "curator:ship-refresh";

/**
 * Going live is the last step of the loop: commit the exported public files
 * and push them, after showing exactly what will go out. Code changes are
 * never included; they still go through a normal commit.
 */
export function ShipButton() {
  const [status, setStatus] = useState<ShipStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    curatorRequest<ShipStatus>("/ship").then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(SHIP_REFRESH_EVENT, refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener(SHIP_REFRESH_EVENT, refresh); };
  }, [refresh]);

  async function ship() {
    setBusy(true); setError("");
    try {
      const result = await curatorRequest<ShipResult>("/ship", { method: "POST" });
      setOpen(false);
      notifications.show({
        title: "已推送，几分钟后上线",
        message: <>提交 {result.commit}{result.deployUrl ? <> · <a href={result.deployUrl} target="_blank" rel="noreferrer">查看部署进度</a></> : null}</>,
        color: "green",
        autoClose: 8000,
      });
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "没有上线成功");
    } finally { setBusy(false); }
  }

  const count = status?.changed ?? 0;
  const extras = [status?.images ? `图片 ${status.images} 张` : "", status?.lists ? `列表与站点数据 ${status.lists} 个文件` : ""].filter(Boolean);

  return <>
    <button type="button" className="ship-button" disabled={!count} onClick={() => { setError(""); setOpen(true); }} title={count ? "把已发布的内容推送到线上" : status ? "已发布的内容都已上线；在编辑器里发布新内容后可以上线" : "连不上本地服务"}>
      {count ? <>上线<span>{status?.titles.length ? `${status.titles.length} 条内容` : `${count} 处改动`}</span></> : status ? "已是最新" : "上线"}
    </button>
    <Modal opened={open} onClose={() => setOpen(false)} title="推送到线上" centered size={460}>
      <div className="ship-modal">
        {status?.titles.length ? <>
          <p>这些内容会出现在公开站：</p>
          <ul>{status.titles.map((title) => <li key={title}>{title}</li>)}</ul>
        </> : <p>公开站的数据有更新。</p>}
        {extras.length ? <p className="ship-extras">另有{extras.join("、")}。</p> : null}
        <p className="ship-note">只推送内容，代码改动不会一起上线。推送后 GitHub Actions 会自动构建并发布到 ai.wenworks.app/tools/，通常几分钟生效。</p>
        {error ? <Alert color="red" mt="sm">{error}</Alert> : null}
        <div className="ship-actions"><Button variant="default" onClick={() => setOpen(false)}>取消</Button><Button loading={busy} onClick={() => void ship()}>推送上线</Button></div>
      </div>
    </Modal>
  </>;
}
