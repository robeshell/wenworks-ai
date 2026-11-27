-- 工具精选的条目：一行一条，五个板块共用。payload 里是各板块自己的字段（双语文案、网址、封面……）。
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('tool', 'site', 'skill', 'project', 'prompt')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  category TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  source_url TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  UNIQUE (kind, slug)
);

-- 每次保存前的样子，用来查看修改记录和撤回。
CREATE TABLE revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  saved_by TEXT NOT NULL DEFAULT '',
  snapshot TEXT NOT NULL
);
CREATE INDEX revisions_entry ON revisions (entry_id, id DESC);

-- 换过板块或地址名的条目，旧地址跳到新地址（导出为 data/route-aliases.json）。
CREATE TABLE aliases (
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  target_id TEXT NOT NULL,
  PRIMARY KEY (kind, slug)
);

-- 每次发布到仓库的记录。
CREATE TABLE publishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  published_at TEXT NOT NULL,
  published_by TEXT NOT NULL DEFAULT '',
  commit_sha TEXT NOT NULL,
  message TEXT NOT NULL,
  files TEXT NOT NULL
);

-- 其他：分类词表（taxonomy.json 原文）等。
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
