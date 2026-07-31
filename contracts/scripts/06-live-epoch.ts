import {
  createPublicClient, createWalletClient, http, encodeAbiParameters,
  formatUnits, keccak256, parseAbi, parseUnits, type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { flareTestnet } from 'viem/chains';
import { readDeployments } from './config.ts';

const rpc = process.env.COSTON2_RPC;
const pk = process.env.PK as Hex | undefined;
const aggUrl = process.env.AGGREGATOR_URL ?? 'http://localhost:8787';
if (!rpc || !pk) throw new Error('Set COSTON2_RPC and PK');

const { testUSD, testXAU, umbraVault } = readDeployments();
if (!testUSD || !testXAU || !umbraVault) throw new Error('Run scripts 00-05 first');

const account = privateKeyToAccount(pk);
const transport = http(rpc);
const publicClient = createPublicClient({ chain: flareTestnet, transport });
const walletClient = createWalletClient({ account, chain: flareTestnet, transport });

const vaultAbi = parseAbi([
  'function deposit(uint256 assets) returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function sharePrice() view returns (uint256)',
  'function epoch() view returns (uint256)',
  'function submitIntent(bytes32 intentCommitment)',
  'function closeEpoch()',
  'function executeRebalance(int256 netDelta, uint256 intentCount, bytes32 intentsCommitment, bytes signature, uint256 amountOutMinimum)',
]);
const erc20 = parseAbi(['function approve(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)']);

async function send(label: string, req: Parameters<typeof walletClient.writeContract>[0]) {
  const hash = await walletClient.writeContract(req);
  const rc = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`${label}: ${rc.status} ${hash}`);
  return rc;
}
function intentCommitment(delta: bigint, salt: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'int256' }, { type: 'bytes32' }], [delta, salt]));
}
async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${aggUrl}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const deposit = parseUnits('1000', 6);
await send('approve tUSD', { address: testUSD, abi: erc20, functionName: 'approve', args: [umbraVault, deposit], account, chain: flareTestnet });
await send('deposit 1000 tUSD', { address: umbraVault, abi: vaultAbi, functionName: 'deposit', args: [deposit], account, chain: flareTestnet });
console.log('totalAssets:', formatUnits(await publicClient.readContract({ address: umbraVault, abi: vaultAbi, functionName: 'totalAssets' }), 6), 'tUSD');

const epoch = await publicClient.readContract({ address: umbraVault, abi: vaultAbi, functionName: 'epoch' });

for (const [i, delta] of [500_000_000n, -200_000_000n].entries()) {
  const salt = keccak256(`0x0${i}` as Hex);
  const commitment = intentCommitment(delta, salt);
  console.log(`submitting private intent ${formatUnits(delta, 6)} tUSD to aggregator...`);
  await post('/intents', { epoch: epoch.toString(), delta: delta.toString(), submitter: account.address, commitment });
  await send(`submitIntent ${formatUnits(delta, 6)}`, { address: umbraVault, abi: vaultAbi, functionName: 'submitIntent', args: [commitment], account, chain: flareTestnet });
}

const view = await fetch(`${aggUrl}/net-delta/${epoch}`, { headers: { 'x-viewer': account.address } }).then((r) => r.json());
console.log('manager private view of net delta:', formatUnits(BigInt(view.netDelta), 6), 'tUSD');

await send('closeEpoch', { address: umbraVault, abi: vaultAbi, functionName: 'closeEpoch', account, chain: flareTestnet });

const att = await post(`/attest/${epoch}`, {}, { 'x-keeper-secret': process.env.KEEPER_SECRET ?? '' });
console.log('attested net delta:', formatUnits(BigInt(att.netDelta), 6), 'tUSD');

await send('executeRebalance (AMM swap)', {
  address: umbraVault, abi: vaultAbi, functionName: 'executeRebalance',
  args: [BigInt(att.netDelta), BigInt(att.intentCount), att.intentsCommitment, att.signature, 0n],
  account, chain: flareTestnet,
});

const [newEpoch, nav, price, xauBal] = await Promise.all([
  publicClient.readContract({ address: umbraVault, abi: vaultAbi, functionName: 'epoch' }),
  publicClient.readContract({ address: umbraVault, abi: vaultAbi, functionName: 'totalAssets' }),
  publicClient.readContract({ address: umbraVault, abi: vaultAbi, functionName: 'sharePrice' }),
  publicClient.readContract({ address: testXAU, abi: erc20, functionName: 'balanceOf', args: [umbraVault] }),
]);
console.log(`settled. epoch ${newEpoch}, NAV ${formatUnits(nav, 6)} tUSD, share price ${formatUnits(price, 6)}, vault tXAU ${formatUnits(xauBal, 18)}`);
