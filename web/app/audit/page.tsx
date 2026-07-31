'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount, useReadContract } from 'wagmi';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { VAULT_ADDRESS, umbraVaultAbi } from '@/lib/contracts';
import { getStrategy } from '@/lib/aggregator';

export default function AuditPage() {
  const { address } = useAccount();
  const [strategy, setStrategy] = useState<string>();
  const [denied, setDenied] = useState(false);

  const { data: isAuditor } = useReadContract({
    address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'isAuditor',
    args: address ? [address] : undefined,
  });
  const { data: epoch } = useReadContract({ address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'epoch' });

  async function tryReveal() {
    if (epoch === undefined || !address) return;
    setDenied(false);
    try {
      const { strategy } = await getStrategy(epoch, address);
      setStrategy(strategy ?? 'no strategy blob recorded for this epoch');
    } catch {
      setDenied(true);
      toast.error('Access denied — no auditor grant for this wallet');
    }
  }

  return (
    <main>
      <Nav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="card-dark text-center">
          {strategy ? (
            <>
              <span className="badge-green inline-flex items-center gap-1">
                <ShieldCheck size={12} /> COMPLIANCE ACCESS
              </span>
              <p className="mono mt-6 text-lg">{strategy}</p>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                disclosed strategy for the current epoch
              </p>
            </>
          ) : (
            <>
              <LockKeyhole size={32} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
              <h2 className="mt-4 text-xl">Strategy is private</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isAuditor
                  ? 'Your wallet is on the auditor allow-list. Reveal to view.'
                  : 'Only allow-listed auditors can view the strategy. Access is scoped and revocable.'}
              </p>
              {denied && <div className="error-banner mt-4">Access denied by the on-chain allow-list.</div>}
              <button className="btn-accent mt-6" onClick={tryReveal} disabled={!address}>
                Attempt reveal
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
