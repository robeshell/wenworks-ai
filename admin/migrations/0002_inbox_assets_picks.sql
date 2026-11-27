-- 上传的图片（logo、封面）。发布时写进 sites/tools/public/ 下的同名路径。
CREATE TABLE assets (
  path TEXT PRIMARY KEY,           -- 网站里的路径，比如 /covers/chatgpt-1a2b3c4d5e.webp
  content_type TEXT NOT NULL,
  data BLOB NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT ''
);

-- 收件箱：贴进来的链接，AI 起草后由人决定收录、放到首页或丢弃。
CREATE TABLE inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('new', 'drafted', 'failed', 'accepted', 'picked', 'dismissed')),
  draft TEXT,                      -- AI 起草的 JSON
  error TEXT NOT NULL DEFAULT '',
  entry_id TEXT,                   -- 收录后对应的条目
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
CREATE INDEX inbox_status ON inbox (status, id DESC);

-- 首页「值得看的讨论」。发布时写成 sites/home/data/picks.json。
CREATE TABLE picks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
