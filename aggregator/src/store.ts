import { type Hex } from 'viem';
import { foldCommitment } from './attestation.ts';

export interface Intent {
  delta: bigint;
  submitter: string;
  commitment: Hex;
  ts: number;
}

interface EpochRecord {
  intents: Intent[];
  commitment: Hex;
  strategyBlob?: string;
}

const ZERO32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export class EpochStore {
  private epochs = new Map<string, EpochRecord>();

  private get(epoch: bigint): EpochRecord {
    const key = epoch.toString();
    let rec = this.epochs.get(key);
    if (!rec) {
      rec = { intents: [], commitment: ZERO32 };
      this.epochs.set(key, rec);
    }
    return rec;
  }

  addIntent(epoch: bigint, intent: Intent): { intentCount: number; commitment: Hex } {
    const rec = this.get(epoch);
    rec.intents.push(intent);
    rec.commitment = foldCommitment(rec.commitment, intent.commitment);
    return { intentCount: rec.intents.length, commitment: rec.commitment };
  }

  netDelta(epoch: bigint): bigint {
    return this.get(epoch).intents.reduce((sum, i) => sum + i.delta, 0n);
  }

  summary(epoch: bigint): { intentCount: number; commitment: Hex } {
    const rec = this.get(epoch);
    return { intentCount: rec.intents.length, commitment: rec.commitment };
  }

  setStrategy(epoch: bigint, blob: string): void {
    this.get(epoch).strategyBlob = blob;
  }

  strategy(epoch: bigint): string | undefined {
    return this.get(epoch).strategyBlob;
  }
}
