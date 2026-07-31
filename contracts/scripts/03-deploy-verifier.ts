import { network } from 'hardhat';
import { readDeployments, saveDeployments } from './config.ts';

const { viem } = await network.connect();

const signer = process.env.AGGREGATOR_SIGNER as `0x${string}` | undefined;
if (!signer) throw new Error('Set AGGREGATOR_SIGNER env var');

const verifier = await viem.deployContract('AttestationVerifier', []);
console.log('AttestationVerifier at', verifier.address);

const publicClient = await viem.getPublicClient();
const hash = await verifier.write.registerSigner([signer]);
await publicClient.waitForTransactionReceipt({ hash });
console.log('Registered aggregator signer', signer);

saveDeployments({ attestationVerifier: verifier.address, aggregatorSigner: signer });
