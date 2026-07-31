import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { flareTestnet } from 'viem/chains';
import { VAULT_ADDRESS, umbraVaultAbi } from '@/lib/contracts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const pk = process.env.KEEPER_PRIVATE_KEY as `0x${string}` | undefined;
  const aggUrl = process.env.AGGREGATOR_URL;
  if (!pk || !aggUrl) {
    return NextResponse.json({ error: 'KEEPER_PRIVATE_KEY / AGGREGATOR_URL not set' }, { status: 500 });
  }

  const account = privateKeyToAccount(pk);
  const transport = http(process.env.NEXT_PUBLIC_RPC_URL);
  const publicClient = createPublicClient({ chain: flareTestnet, transport });
  const walletClient = createWalletClient({ account, chain: flareTestnet, transport });

  const vault = { address: VAULT_ADDRESS, abi: umbraVaultAbi } as const;
  const [epoch, epochClosed] = await Promise.all([
    publicClient.readContract({ ...vault, functionName: 'epoch' }),
    publicClient.readContract({ ...vault, functionName: 'epochClosed' }),
  ]);
  const intents = await publicClient.readContract({ ...vault, functionName: 'epochIntentCount', args: [epoch] });

  if (!epochClosed && intents === 0n) {
    return NextResponse.json({ epoch: epoch.toString(), action: 'noop, no intents' });
  }

  if (!epochClosed) {
    const hash = await walletClient.writeContract({ ...vault, functionName: 'closeEpoch' });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  const att = await fetch(`${aggUrl}/attest/${epoch}`, {
    method: 'POST',
    headers: { 'x-keeper-secret': process.env.KEEPER_SECRET ?? '' },
  }).then((r) => r.json());

  const hash = await walletClient.writeContract({
    ...vault,
    functionName: 'executeRebalance',
    args: [BigInt(att.netDelta), BigInt(att.intentCount), att.intentsCommitment, att.signature, 0n],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  return NextResponse.json({ epoch: epoch.toString(), netDelta: att.netDelta, settlementTx: hash });
}
