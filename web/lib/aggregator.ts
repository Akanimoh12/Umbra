import { encodeAbiParameters, keccak256, type Hex } from 'viem';

const BASE = process.env.NEXT_PUBLIC_AGGREGATOR_URL ?? 'http://localhost:8787';

export function intentCommitment(delta: bigint, salt: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'int256' }, { type: 'bytes32' }], [delta, salt]));
}

export function randomSalt(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return ('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')) as Hex;
}

export async function postIntent(body: {
  epoch: string; delta: string; submitter: string; commitment: Hex;
}): Promise<{ intentCount: number; commitment: Hex }> {
  const res = await fetch(`${BASE}/intents`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getNetDelta(epoch: bigint, viewer: string): Promise<{ netDelta: string; intentCount: number }> {
  const res = await fetch(`${BASE}/net-delta/${epoch}`, { headers: { 'x-viewer': viewer } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getStrategy(epoch: bigint, viewer: string): Promise<{ strategy: string | null }> {
  const res = await fetch(`${BASE}/strategy/${epoch}`, { headers: { 'x-viewer': viewer } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
