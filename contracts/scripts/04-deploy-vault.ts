import { network } from 'hardhat';
import { readDeployments, saveDeployments } from './config.ts';

const { viem } = await network.connect();
const { testUSD, testXAU, router, pair, attestationVerifier } = readDeployments();
if (!testUSD || !testXAU || !router || !pair || !attestationVerifier) {
  throw new Error('Run scripts 00-03 first');
}

const [wallet] = await viem.getWalletClients();
const deployer = wallet.account.address;

const vault = await viem.deployContract('UmbraVault', [
  testUSD,
  testXAU,
  router,
  pair,
  attestationVerifier,
  deployer,
  deployer,
]);
console.log('UmbraVault at', vault.address);

saveDeployments({ umbraVault: vault.address, manager: deployer, keeper: deployer });
console.log('Set NEXT_PUBLIC_VAULT_ADDRESS in web/.env.local to', vault.address);
