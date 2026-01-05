// Google Drive appDataFolder client (MV3 + chrome.identity)
// Note: Requires manifest oauth2 client_id and scope https://www.googleapis.com/auth/drive.appdata

export interface DriveFileInfo {
  fileId: string;
  modifiedTime?: string;
  md5Checksum?: string;
}

// Compression helpers using native CompressionStream API
async function compressString(text: string): Promise<Uint8Array> {
  const blob = new Blob([text]);
  const stream = blob.stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const compressedBlob = await new Response(compressedStream).blob();
  return new Uint8Array(await compressedBlob.arrayBuffer());
}

async function decompressString(data: Uint8Array): Promise<string> {
  const blob = new Blob([data as any]);
  const stream = blob.stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const decompressedBlob = await new Response(decompressedStream).blob();
  return await decompressedBlob.text();
}

async function getAuthToken(interactive = false): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      (chrome as any).identity.getAuthToken({ interactive }, (token: string) => {
        const err = (chrome as any).runtime?.lastError;
        if (token) resolve(token);
        else reject(new Error(err?.message || 'Failed to obtain auth token'));
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

export async function connect(interactive = true): Promise<{ ok: boolean }> {
  // Obtain/refresh token. When interactive=false, Chrome 可能返回快取 token 或失敗。
  await getAuthToken(interactive);
  await driveFetch(
    `/drive/v3/files?q='appDataFolder'+in+parents&spaces=appDataFolder&fields=files(id)&pageSize=1`,
    {},
    interactive,
  );
  return { ok: true };
}

export async function getFile(name = 'linktrove.json.gz'): Promise<DriveFileInfo | null> {
  // Try compressed file first, fallback to uncompressed for backward compatibility
  let res = await driveFetch(
    `/drive/v3/files?q='appDataFolder'+in+parents+and+name='${encodeURIComponent(
      name,
    )}'&spaces=appDataFolder&fields=files(id,name,modifiedTime,md5Checksum)&pageSize=1`,
  );
  let data = await res.json();
  let f = (data?.files || [])[0];

  // If compressed file not found, try uncompressed
  if (!f && name === 'linktrove.json.gz') {
    res = await driveFetch(
      `/drive/v3/files?q='appDataFolder'+in+parents+and+name='linktrove.json'&spaces=appDataFolder&fields=files(id,name,modifiedTime,md5Checksum)&pageSize=1`,
    );
    data = await res.json();
    f = (data?.files || [])[0];
  }

  if (!f) return null;
  return {
    fileId: f.id,
    modifiedTime: f.modifiedTime,
    md5Checksum: f.md5Checksum,
  };
}

export async function download(fileId: string): Promise<string> {
  const res = await driveFetch(`/drive/v3/files/${fileId}?alt=media`);
  const arrayBuffer = await res.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Try to decompress (gzip format starts with 0x1f 0x8b)
  if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
    try {
      return await decompressString(data);
    } catch (e) {
      console.warn('Decompression failed, treating as plain text:', e);
      // Fallback to plain text
      return new TextDecoder().decode(data);
    }
  }

  // Plain text (uncompressed)
  return new TextDecoder().decode(data);
}

export async function createOrUpdate(content: string, name = 'linktrove.json.gz'): Promise<DriveFileInfo> {
  // Compress content
  const compressed = await compressString(content);
  const originalSize = new Blob([content]).size;
  const compressedSize = compressed.length;
  console.log(`[Drive] Compression: ${originalSize} → ${compressedSize} bytes (${((compressedSize / originalSize) * 100).toFixed(1)}%)`);

  const existing = await getFile(name);
  if (!existing) {
    // multipart upload
    const metadata = { name, parents: ['appDataFolder'] };
    const boundary = '-------lnktrove' + Math.random().toString(36).slice(2);

    // Build multipart body with compressed binary data
    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const contentPart = `--${boundary}\r\nContent-Type: application/gzip\r\n\r\n`;
    const endBoundary = `\r\n--${boundary}--`;

    // Combine parts into Uint8Array
    const encoder = new TextEncoder();
    const metadataBytes = encoder.encode(metadataPart);
    const contentBytes = encoder.encode(contentPart);
    const endBytes = encoder.encode(endBoundary);

    const body = new Uint8Array(metadataBytes.length + contentBytes.length + compressed.length + endBytes.length);
    body.set(metadataBytes, 0);
    body.set(contentBytes, metadataBytes.length);
    body.set(compressed, metadataBytes.length + contentBytes.length);
    body.set(endBytes, metadataBytes.length + contentBytes.length + compressed.length);

    const res = await driveFetch(`/upload/drive/v3/files?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    const data = await res.json();
    return {
      fileId: data.id,
      modifiedTime: data.modifiedTime,
      md5Checksum: data.md5Checksum,
    };
  } else {
    // media upload overwrite
    await driveFetch(`/upload/drive/v3/files/${existing.fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/gzip' },
      body: compressed as any,
    });
    // Fetch updated metadata to capture latest modifiedTime/md5
    const refreshed = await getFile(name);
    return (
      refreshed || {
        fileId: existing.fileId,
        modifiedTime: existing.modifiedTime,
        md5Checksum: existing.md5Checksum,
      }
    );
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
