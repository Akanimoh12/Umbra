import { network } from 'hardhat';
import { readDeployments, saveDeployments } from './config.ts';

const { viem } = await network.connect();
const { testUSD, testXAU } = readDeployments();
if (!testUSD || !testXAU) throw new Error('Run 00-deploy-tokens first');

const factory = await viem.deployContract('UmbraFactory', []);
const router = await viem.deployContract('UmbraRouter', [factory.address]);
console.log('UmbraFactory at', factory.address);
console.log('UmbraRouter at', router.address);

const publicClient = await viem.getPublicClient();
const hash = await factory.write.createPair([testUSD, testXAU]);
await publicClient.waitForTransactionReceipt({ hash });
const pair = await factory.read.getPair([testUSD, testXAU]);
console.log('Pair at', pair);

saveDeployments({ factory: factory.address, router: router.address, pair });
