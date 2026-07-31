import { network } from 'hardhat';
import { readDeployments, saveDeployments } from './config.ts';

const { viem } = await network.connect();
const { umbraVault } = readDeployments();
if (!umbraVault) throw new Error('Run 04-deploy-vault first');

const manager = process.env.MANAGER as `0x${string}` | undefined;
const keeper = process.env.KEEPER as `0x${string}` | undefined;
const auditor = process.env.AUDITOR as `0x${string}` | undefined;
if (!manager || !keeper) throw new Error('Set MANAGER and KEEPER env vars');

const publicClient = await viem.getPublicClient();
const vault = await viem.getContractAt('UmbraVault', umbraVault);

let hash = await vault.write.setRoles([manager, keeper]);
await publicClient.waitForTransactionReceipt({ hash });
console.log('Roles wired, manager:', manager, 'keeper:', keeper);

if (auditor) {
  hash = await vault.write.grantAuditor([auditor]);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('Auditor granted', auditor);
}

saveDeployments({ manager, keeper });
