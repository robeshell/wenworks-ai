export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  SITE_URL: string;
  GITHUB_TOKEN?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /** Local development only (.dev.vars). */
  DEV_USER?: string;
}
