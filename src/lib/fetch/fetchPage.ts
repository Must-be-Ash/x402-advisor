// Server-only. Hybrid page fetch: Firecrawl (clean markdown) → native fetch fallback.

const MAX_CHARS = 24_000; // ~6–8k tokens per page

export type FetchSource = "firecrawl" | "native" | "error";

export interface FetchResult {
  url: string;
  markdown: string;
  source: FetchSource;
  error?: string;
}

function cap(s: string): string {
  const t = s.trim();
  return t.length > MAX_CHARS
    ? `${t.slice(0, MAX_CHARS)}\n\n…[truncated]`
    : t;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

async function tryFirecrawl(url: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { markdown?: string } };
    const md = json?.data?.markdown;
    return md && md.trim() ? md : null;
  } catch {
    return null;
  }
}

async function tryNative(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (x402-setup)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return stripHtml(html);
  } catch {
    return null;
  }
}

/** Fetch a URL as markdown. Firecrawl first, native fetch as fallback. */
export async function fetchPage(url: string): Promise<FetchResult> {
  const fc = await tryFirecrawl(url);
  if (fc) return { url, markdown: cap(fc), source: "firecrawl" };

  const nat = await tryNative(url);
  if (nat) return { url, markdown: cap(nat), source: "native" };

  return { url, markdown: "", source: "error", error: "fetch failed" };
}

/** Best-effort GitHub README fetch (README.md on the default branch). */
export async function fetchGithubReadme(repoUrl: string): Promise<FetchResult> {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return { url: repoUrl, markdown: "", source: "error", error: "not a github repo url" };
  const [, owner, repoRaw] = m;
  const repo = repoRaw.replace(/\.git$/, "");
  for (const branch of ["HEAD", "main", "master"]) {
    for (const name of ["README.md", "readme.md", "README.markdown"]) {
      const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${name}`;
      const r = await tryNative(raw);
      if (r) return { url: raw, markdown: cap(r), source: "native" };
    }
  }
  return { url: repoUrl, markdown: "", source: "error", error: "README not found" };
}
