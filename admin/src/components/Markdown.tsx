import { Marked } from 'marked';
import { useMemo } from 'react';

// Preview only. Raw HTML in the text is dropped and only http(s)/relative links survive,
// so nothing pasted into an entry can run script in the admin.
const md = new Marked({
  gfm: true,
  renderer: { html: () => '' },
  walkTokens(token) {
    if ((token.type === 'link' || token.type === 'image') && !/^(https?:\/\/|\/|#)/i.test(token.href)) token.href = '#';
  },
});

export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => md.parse(text || '') as string, [text]);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
