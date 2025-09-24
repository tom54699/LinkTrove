// Google Drive appDataFolder client (MV3 + chrome.identity)
// Note: Requires manifest oauth2 client_id and scope https://www.googleapis.com/auth/drive.appdata

export interface DriveFileInfo {
  fileId: string;
  modifiedTime?: string;
}

async function getAuthToken(interactive = false): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      (chrome as any).identity.getAuthToken({ interactive }, (token: string) => {
        if (token) resolve(token);
        else reject(new Error('Failed to obtain auth token'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function driveFetch(path: string, init: RequestInit = {}, interactive = false) {
  const token = await getAuthToken(interactive);
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    // On 401, try interactive refresh once
    if (res.status === 401 && !interactive) return driveFetch(path, init, true);
    const text = await res.text().catch(() => '');
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  return res;
}

export async function connect(): Promise<{ ok: boolean }> {
  // Simply attempt to fetch about or files list to validate token
  await driveFetch(
    `/drive/v3/files?q='appDataFolder'+in+parents&spaces=appDataFolder&fields=files(id)&pageSize=1`,
    {},
  );
  return { ok: true };
}

export async function getFile(name = 'linktrove.json'): Promise<DriveFileInfo | null> {
  const res = await driveFetch(
    `/drive/v3/files?q='appDataFolder'+in+parents+and+name='${encodeURIComponent(
      name,
    )}'&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=1`,
  );
  const data = await res.json();
  const f = (data?.files || [])[0];
  if (!f) return null;
  return { fileId: f.id, modifiedTime: f.modifiedTime };
}

export async function download(fileId: string): Promise<string> {
  const res = await driveFetch(`/drive/v3/files/${fileId}?alt=media`);
  return await res.text();
}

export async function createOrUpdate(content: string, name = 'linktrove.json'): Promise<DriveFileInfo> {
  const existing = await getFile(name);
  if (!existing) {
    // multipart upload
    const metadata = { name, parents: ['appDataFolder'] };
    const boundary = '-------lnktrove' + Math.random().toString(36).slice(2);
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata,
    )}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    const res = await driveFetch(`/upload/drive/v3/files?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    const data = await res.json();
    return { fileId: data.id, modifiedTime: data.modifiedTime };
  } else {
    // media upload overwrite
    await driveFetch(`/upload/drive/v3/files/${existing.fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    });
    return existing;
  }
}

export async function disconnect(): Promise<void> {
  try {
    // Remove cached token; user may need to re-consent later
    (chrome as any).identity.getAuthToken({ interactive: false }, (token: string) => {
      if (!token) return;
      try {
        (chrome as any).identity.removeCachedAuthToken({ token }, () => {});
      } catch {}
    });
  } catch {}
}

