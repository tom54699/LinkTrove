import { describe, it, expect, beforeEach } from 'vitest';
import { clearStore, getAll } from '../idb/db';
import { importNetscapeHtmlAsNewCategory } from '../importers/html';

async function reset() {
  await clearStore('webpages');
  await clearStore('categories');
  await clearStore('templates');
  try { await clearStore('subcategories' as any); } catch {}
}

// User-provided Netscape HTML sample with nested H3 folders and many links
const SAMPLE = String.raw`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1750042564" LAST_MODIFIED="1757558781" PERSONAL_TOOLBAR_FOLDER="true">我的最愛列</H3>
    <DL><p>
        <DT><A HREF="https://mail.google.com/mail/u/0/#inbox">Gmail</A>
        <DT><A HREF="https://hackmd.io/bookmark">HackMD</A>
        <DT><A HREF="https://gitlab.com">GitLab</A>
        <DT><A HREF="https://myaninnovation-teams.atlassian.net/jira/software/c/projects/CT/boards/6">Jira</A>
        <DT><A HREF="https://ap-southeast-2.console.aws.amazon.com/console/home?region=ap-southeast-2#">AWS</A>
        <DT><A HREF="https://dashboard.pusher.com/accounts/sign_in">Sign in - Pusher</A>
        <DT><H3>Figma</H3>
        <DL><p>
            <DT><A HREF="https://www.figma.com/design/abc">A</A>
            <DT><A HREF="https://www.figma.com/design/def">B</A>
        </DL><p>
        <DT><H3>AI Model</H3>
        <DL><p>
            <DT><A HREF="https://chatgpt.com">ChatGPT</A>
            <DT><A HREF="https://claude.ai">Claude</A>
            <DT><A HREF="https://manus.im/app">Manus</A>
            <DT><A HREF="https://www.kimi.com/">Kimi</A>
            <DT><A HREF="https://gemini.google.com">Google Gemini</A>
        </DL><p>
        <DT><A HREF="https://docs.google.com/spreadsheets/...">CaCa Language</A>
        <DT><A HREF="https://hub.docker.com/repository/docker/...">Docker Hub</A>
    </DL><p>
</DL><p>`;

describe('HTML import (sample fallback + groups)', () => {
  beforeEach(async () => { await reset(); });

  it('creates a new collection with groups from H3 and imports all anchors', async () => {
    const res = await importNetscapeHtmlAsNewCategory(SAMPLE, { name: 'Sample' });
    expect(res.categoryId).toBeTruthy();
    // Should create at least these groups
    const subcats = await getAll('subcategories' as any);
    const names = subcats.filter((s: any) => s.categoryId === res.categoryId).map((s: any) => s.name);
    expect(names).toEqual(expect.arrayContaining(['我的最愛列', 'Figma', 'AI Model']));
    // Pages should be > 10 based on the sample
    const pages = await getAll('webpages');
    const inCat = pages.filter((p: any) => p.category === res.categoryId);
    expect(inCat.length).toBeGreaterThanOrEqual(10);
  });
});

