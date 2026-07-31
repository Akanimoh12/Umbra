import { network } from 'hardhat';
import { parseAbi } from 'viem';
import { readDeployments } from './config.ts';

const { viem } = await network.connect();
const { testUSD, testXAU, router } = readDeployments();
if (!testUSD || !testXAU || !router) throw new Error('Run scripts 00-01 first');

const publicClient = await viem.getPublicClient();
const [wallet] = await viem.getWalletClients();

// small seed: 2,000 tUSD + 1 tXAU  ->  1 tXAU = 2,000 tUSD
const usdAmount = 2_000_000_000n;
const xauAmount = 1_000_000_000_000_000_000n;

const erc20 = parseAbi(['function approve(address,uint256) returns (bool)']);
for (const [token, amount] of [[testUSD, usdAmount], [testXAU, xauAmount]] as const) {
  const hash = await wallet.writeContract({ address: token, abi: erc20, functionName: 'approve', args: [router, amount] });
  await publicClient.waitForTransactionReceipt({ hash });
}
console.log('Approvals done');

const routerAbi = parseAbi([
  'function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB, address to) returns (uint256)',
]);
const hash = await wallet.writeContract({
  address: router,
  abi: routerAbi,
  functionName: 'addLiquidity',
  args: [testUSD, testXAU, usdAmount, xauAmount, wallet.account.address],
});
await publicClient.waitForTransactionReceipt({ hash });
console.log('Liquidity seeded: 2,000 tUSD + 1 tXAU');
