export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  SITE_URL: string;
  GITHUB_TOKEN?: string;
  /** OpenRouter key for AI drafting (Worker secret). */
  OPENROUTER_API_KEY?: string;
  /** Local development only: a stand-in for OpenRouter. */
  OPENROUTER_URL?: string;
  /** Local development only: a stand-in for the GitHub API. */
  GITHUB_API?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /** Local development only (.dev.vars). */
  DEV_USER?: string;
}
