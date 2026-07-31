import { formatUnits } from 'viem';

export function formatToken(value: bigint | undefined, decimals = 6, digits = 2): string {
  if (value === undefined) return '—';
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export function shortHash(hash: string, chars = 6): string {
  if (!hash || hash.length < 2 * chars + 2) return hash;
  return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
}

const EXPLORER = 'https://coston2-explorer.flare.network';

export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${EXPLORER}/address/${address}`;
}
