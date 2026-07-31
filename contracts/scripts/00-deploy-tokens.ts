import { network } from 'hardhat';
import { saveDeployments } from './config.ts';

const { viem } = await network.connect();

const usd = await viem.deployContract('TestUSD', []);
const xau = await viem.deployContract('TestXAU', []);
console.log('TestUSD at', usd.address);
console.log('TestXAU at', xau.address);

const [wallet] = await viem.getWalletClients();
await usd.write.mint([wallet.account.address, 1_000_000_000_000n]);
await xau.write.mint([wallet.account.address, 100_000_000_000_000_000_000n]);
console.log('Minted working balances to deployer');

saveDeployments({ testUSD: usd.address, testXAU: xau.address });
