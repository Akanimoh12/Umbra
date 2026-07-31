'use client';

import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { Lock, Copy, Crosshair, ScanEye, Github, ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { VAULT_ADDRESS, umbraVaultAbi } from '@/lib/contracts';
import { formatToken, shortHash, explorerAddress } from '@/lib/format';

export default function Landing() {
  const { data: tvl } = useReadContract({ address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'totalAssets' });
  const { data: sharePrice } = useReadContract({ address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'sharePrice' });
  const { data: epoch } = useReadContract({ address: VAULT_ADDRESS, abi: umbraVaultAbi, functionName: 'epoch' });
  const { data: intents } = useReadContract({
    address: VAULT_ADDRESS,
    abi: umbraVaultAbi,
    functionName: 'epochIntentCount',
    args: epoch !== undefined ? [epoch] : undefined,
  });

  return (
    <main>
      <Nav />

      <section className="grid-bg px-6 pb-24 pt-16 text-center md:pb-28 md:pt-20">
        <p className="badge-accent mx-auto mb-6 inline-block text-sm font-semibold tracking-wide">
          CONFIDENTIAL STRATEGY VAULT ON FLARE
        </p>
        <h1 className="mx-auto max-w-4xl text-6xl font-extrabold leading-[1.05] md:text-8xl">
          Public returns.
          <br />
          <span style={{ color: 'var(--accent)' }}>Private strategy.</span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-xl font-medium md:text-2xl" style={{ color: 'var(--text-secondary)' }}>
          A vault where NAV and performance are fully on-chain, but the manager&apos;s
          strategy stays private until it settles as one attested trade.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/app" className="btn-accent text-lg font-bold">Launch App</Link>
          <a href="#how-it-works" className="btn-outline text-lg">How it works</a>
        </div>

        <div className="mx-auto mt-20 flex max-w-3xl flex-wrap justify-center gap-x-14 gap-y-8">
          <Stat label="Total value locked" value={`$${formatToken(tvl)}`} />
          <Stat label="Share price" value={`$${formatToken(sharePrice, 6, 4)}`} />
          <Stat label="Current epoch" value={epoch?.toString() ?? '—'} />
          <Stat label="Private intents" value={intents?.toString() ?? '—'} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-4xl font-extrabold md:text-5xl">
          Public strategies get eaten alive
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg" style={{ color: 'var(--text-secondary)' }}>
          Every fund that considered running money on-chain hit the same wall.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <ProblemCard icon={<Copy size={24} />} title="Copy-traded">
            Public weights let anyone clone your strategy for free — your alpha funds
            someone else&apos;s portfolio.
          </ProblemCard>
          <ProblemCard icon={<Crosshair size={24} />} title="Front-run">
            Visible rebalances get sandwiched before they settle. Every trade pays an
            invisible tax to bots.
          </ProblemCard>
          <ProblemCard icon={<ScanEye size={24} />} title="Reverse-engineered">
            A few epochs of on-chain history and your entire model is public property.
          </ProblemCard>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="text-4xl font-extrabold md:text-5xl">How Umbra works</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--text-secondary)' }}>
          Intents stay private off-chain, are aggregated by an attested service, and
          only the net batch reaches the market.
        </p>
        <div className="mono mt-12 flex flex-wrap items-center justify-center gap-4 text-base">
          {['submit privately', 'aggregate', 'attest net only', 'settle on Flare'].map((step, i) => (
            <span key={step} className="flex items-center gap-4">
              {i > 0 && <span className="text-xl" style={{ color: 'var(--text-muted)' }}>→</span>}
              <span className="address-badge px-4 py-2 text-sm font-bold">{step}</span>
            </span>
          ))}
        </div>
        <p className="address-badge mx-auto mt-10 inline-flex items-center gap-2 text-sm">
          <Lock size={14} style={{ color: 'var(--accent)' }} />
          two intents in, one signed number out — attribution is gone
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-4xl font-extrabold md:text-5xl">
          Public where it builds trust.
          <br />
          Private where it protects alpha.
        </h2>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="card-dark">
            <h3 className="mb-5 text-2xl font-bold">Transparent</h3>
            <div className="flex flex-wrap gap-2.5">
              {['NAV', 'TVL', 'share price', 'epochs', 'settlement txs', 'LP balances'].map((t) => (
                <span key={t} className="badge-green px-3 py-1 text-sm font-semibold">{t}</span>
              ))}
            </div>
            <p className="mt-5 text-base" style={{ color: 'var(--text-secondary)' }}>
              LPs see everything that matters to them. Shares are a plain ERC-20 —
              composable anywhere.
            </p>
          </div>
          <div className="card-dark">
            <h3 className="mb-5 text-2xl font-bold">Private</h3>
            <div className="flex flex-wrap gap-2.5">
              {['weights', 'intents', 'timing', 'attribution', 'strategy'].map((t) => (
                <span key={t} className="badge-accent px-3 py-1 text-sm font-semibold">{t}</span>
              ))}
            </div>
            <p className="mt-5 text-base" style={{ color: 'var(--text-secondary)' }}>
              Individual intents never touch the chain. Only the attested net delta is
              revealed and settled.
            </p>
          </div>
        </div>
        <div className="card-dark mt-6">
          <span className="badge-muted px-3 py-1 text-sm font-semibold">COMPLIANCE</span>
          <p className="mt-4 text-base" style={{ color: 'var(--text-secondary)' }}>
            Auditors get scoped, revocable read access via an on-chain allow-list —
            selective disclosure without a data room.
          </p>
        </div>
      </section>

      <footer className="border-t px-6 pb-10 pt-14" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div>
            <p className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>UMBRA</p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Public returns, private strategy — on Flare.
            </p>
          </div>
          <FooterCol title="App">
            <FooterLink href="/app">Vault</FooterLink>
            <FooterLink href="/manage">Manager console</FooterLink>
            <FooterLink href="/audit">Auditor view</FooterLink>
          </FooterCol>
          <FooterCol title="Protocol">
            <FooterLink href={explorerAddress(VAULT_ADDRESS)} external>
              Vault contract {shortHash(VAULT_ADDRESS, 4)}
            </FooterLink>
            <FooterLink href="https://dev.flare.network" external>Flare docs</FooterLink>
            <FooterLink href="https://faucet.flare.network/coston2" external>Coston2 faucet</FooterLink>
          </FooterCol>
          <FooterCol title="Project">
            <FooterLink href="https://github.com/" external>
              <span className="inline-flex items-center gap-1.5"><Github size={14} /> GitHub</span>
            </FooterLink>
          </FooterCol>
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          <span>Built on Flare · Coston2 testnet</span>
          <span className="mono">{shortHash(VAULT_ADDRESS, 6)}</span>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function ProblemCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card-dark">
      <div className="mb-4" style={{ color: 'var(--accent)' }}>{icon}</div>
      <h3 className="mb-3 text-xl font-bold">{title}</h3>
      <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</p>
    </div>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FooterLink({ href, external, children }: { href: string; external?: boolean; children: React.ReactNode }) {
  const cls = 'flex items-center gap-1 text-sm transition-colors hover:text-white';
  const style = { color: 'var(--text-secondary)' };
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} style={style}>
        {children} <ArrowUpRight size={12} />
      </a>
    );
  }
  return <Link href={href} className={cls} style={style}>{children}</Link>;
}
