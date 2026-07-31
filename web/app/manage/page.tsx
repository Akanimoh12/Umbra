'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits, type Hex } from 'viem';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Lock, ShieldCheck } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { VAULT_ADDRESS, umbraVaultAbi } from '@/lib/contracts';
import { intentCommitment, randomSalt, postIntent, getNetDelta } from '@/lib/aggregator';
import { explorerTx, shortHash } from '@/lib/format';

type Stage = 'idle' | 'computing' | 'submitting-agg' | 'recording' | 'done';

const STAGE_LABEL: Record<Exclude<Stage, 'idle'>, string> = {
  computing: 'computing delta locally…',
  'submitting-agg': 'submitting intent to attested aggregator…',
  recording: 'recording commitment on Flare…',
  done: '✓ intent aggregated — the value never touched the chain',
};

export default function ManagePage() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: manager } = useReadContract({ address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'manager' });
  const { data: epoch } = useReadContract({ address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'epoch' });
  const isManager = !!address && !!manager && address.toLowerCase() === manager.toLowerCase();

  const [delta, setDelta] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [commitment, setCommitment] = useState<Hex>();
  const [txHash, setTxHash] = useState<string>();
  const [privateView, setPrivateView] = useState<string>();

  async function submitIntent() {
    if (epoch === undefined || !address) return;
    try {
      setStage('computing');
      const signedDelta = parseUnits(delta, 6);
      const salt = randomSalt();
      const c = intentCommitment(signedDelta, salt);
      setCommitment(c);

      setStage('submitting-agg');
      await postIntent({ epoch: epoch.toString(), delta: signedDelta.toString(), submitter: address, commitment: c });

      setStage('recording');
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'submitIntent', args: [c],
      });
      setTxHash(hash);
      setStage('done');
      toast.success('Private intent aggregated');
    } catch (err) {
      setStage('idle');
      toast.error(err instanceof Error ? err.message.slice(0, 120) : 'Intent failed');
    }
  }

  async function decryptNetDelta() {
    if (epoch === undefined || !address) return;
    try {
      const { netDelta } = await getNetDelta(epoch, address);
      setPrivateView((Number(netDelta) / 1e6).toString());
    } catch {
      toast.error('Not authorized to view — are you the manager?');
    }
  }

  return (
    <main>
      <Nav />
      <div className="mx-auto max-w-5xl px-6 py-12">
        {!isManager && (
          <div className="error-banner mb-8">
            Connected wallet is not the vault manager — read-only view.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card-glow">
            <h2 className="mb-1 text-xl">Submit private intent</h2>
            <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Signed delta in tUSD. Positive buys the target, negative sells.
            </p>
            <input
              className="input-dark w-full"
              placeholder="e.g. 250 or -100"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
            <button
              className="btn-accent mt-4 w-full"
              onClick={submitIntent}
              disabled={!isManager || !delta || (stage !== 'idle' && stage !== 'done')}
            >
              Submit intent
            </button>

            {stage !== 'idle' && (
              <div className="mono mt-6 space-y-2 text-xs">
                {(Object.keys(STAGE_LABEL) as (keyof typeof STAGE_LABEL)[]).map((s) => (
                  <div
                    key={s}
                    style={{
                      color: stage === s ? 'var(--accent)' : stageReached(stage, s) ? 'var(--green)' : 'var(--text-muted)',
                    }}
                  >
                    {STAGE_LABEL[s]}
                  </div>
                ))}
                {commitment && (
                  <div className="address-badge mt-3 flex items-center gap-2">
                    <Lock size={12} style={{ color: 'var(--accent)' }} />
                    {shortHash(commitment, 10)}
                  </div>
                )}
                {txHash && (
                  <a href={explorerTx(txHash)} target="_blank" className="block underline" style={{ color: 'var(--accent)' }}>
                    view tx on Coston2 explorer
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="card-dark">
            <h2 className="mb-4 text-xl">Chain vs. you</h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="badge-muted">what the chain sees</span>
                <p className="mono mt-2 break-all text-xs" style={{ color: 'var(--text-muted)' }}>
                  {commitment ?? 'a 32-byte commitment + a running count — submit an intent to see it'}
                </p>
              </div>
              <div>
                <span className="badge-accent">what you see</span>
                <p className="mono mt-2 text-xs">
                  {privateView !== undefined ? `net delta: ${privateView} tUSD` : '—'}
                </p>
                <button className="btn-outline mt-3 text-sm" onClick={decryptNetDelta} disabled={!isManager}>
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} /> View net delta (private)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function stageReached(current: Stage, target: Stage): boolean {
  const order: Stage[] = ['idle', 'computing', 'submitting-agg', 'recording', 'done'];
  return order.indexOf(current) > order.indexOf(target);
}
