function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (const b of buf) out += b.toString(16).padStart(2, '0');
  return out;
}

export function createClientRequestId(prefix = 'req_'): string {
  const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return `${prefix}${cryptoObj.randomUUID()}`;
  return `${prefix}${randomHex(16)}`;
}

