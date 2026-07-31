import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { encodeAbiParameters, keccak256, parseUnits, zeroHash, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const AGG_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as Hex;

function foldCommitment(prev: Hex, c: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }], [prev, c]));
}
function intentCommitment(delta: bigint, salt: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'int256' }, { type: 'bytes32' }], [delta, salt]));
}

describe('UmbraVault', () => {
  it('aggregates private intents and settles only the attested net delta', async () => {
    const { viem } = await network.connect();
    const [wallet] = await viem.getWalletClients();
    const me = wallet.account.address;
    const agg = privateKeyToAccount(AGG_KEY);

    const usd = await viem.deployContract('TestUSD', []);
    const xau = await viem.deployContract('TestXAU', []);
    const factory = await viem.deployContract('UmbraFactory', []);
    const router = await viem.deployContract('UmbraRouter', [factory.address]);
    const verifier = await viem.deployContract('AttestationVerifier', []);
    await verifier.write.registerSigner([agg.address]);

    const publicClient = await viem.getPublicClient();
    await factory.write.createPair([usd.address, xau.address]);
    const pair = await factory.read.getPair([usd.address, xau.address]);

    // seed the pool: 20,000 tUSD + 10 tXAU
    await usd.write.mint([me, parseUnits('1000000', 6)]);
    await xau.write.mint([me, parseUnits('1000', 18)]);
    await usd.write.approve([router.address, parseUnits('20000', 6)]);
    await xau.write.approve([router.address, parseUnits('10', 18)]);
    await router.write.addLiquidity([
      usd.address, xau.address, parseUnits('20000', 6), parseUnits('10', 18), me,
    ]);

    const vault = await viem.deployContract('UmbraVault', [
      usd.address, xau.address, router.address, pair, verifier.address, me, me,
    ]);

    // LP deposits 10,000 tUSD
    await usd.write.approve([vault.address, parseUnits('10000', 6)]);
    await vault.write.deposit([parseUnits('10000', 6)]);
    assert.equal(await vault.read.totalAssets(), parseUnits('10000', 6));

    // two private intents: +500 and -200 tUSD. only commitments go on-chain.
    const deltas = [500_000_000n, -200_000_000n];
    let expectedCommitment: Hex = zeroHash;
    for (let i = 0; i < deltas.length; i++) {
      const salt = keccak256(`0x0${i}` as Hex);
      const c = intentCommitment(deltas[i], salt);
      expectedCommitment = foldCommitment(expectedCommitment, c);
      await vault.write.submitIntent([c]);
    }
    assert.equal(await vault.read.epochIntentCount([0n]), 2n);
    assert.equal(await vault.read.epochIntentsCommitment([0n]), expectedCommitment);

    const netDelta = deltas.reduce((a, b) => a + b, 0n); // +300
    assert.equal(netDelta, 300_000_000n);

    await vault.write.closeEpoch();

    // aggregator signs the net delta; contract verifies the attestation
    const signature = await agg.signTypedData({
      domain: { name: 'UmbraAttestation', version: '1', chainId: await publicClient.getChainId(), verifyingContract: verifier.address },
      types: {
        NetDelta: [
          { name: 'epoch', type: 'uint256' },
          { name: 'netDelta', type: 'int256' },
          { name: 'intentCount', type: 'uint256' },
          { name: 'intentsCommitment', type: 'bytes32' },
        ],
      },
      primaryType: 'NetDelta',
      message: { epoch: 0n, netDelta, intentCount: 2n, intentsCommitment: expectedCommitment },
    });

    await vault.write.executeRebalance([netDelta, 2n, expectedCommitment, signature, 0n]);
    assert.equal(await vault.read.epoch(), 1n);
    assert.ok((await xau.read.balanceOf([vault.address])) > 0n, 'vault bought tXAU');

    // negative test: a forged signer is rejected
    const rogue = privateKeyToAccount('0x8b3a350cf5c34c9194ca3a545d075d0ef82c5be7cbadb61e6b9c8f52f7b2b5e6');
    await vault.write.submitIntent([intentCommitment(100n, zeroHash)]);
    await vault.write.closeEpoch();
    const commit1 = foldCommitment(zeroHash, intentCommitment(100n, zeroHash));
    const badSig = await rogue.signTypedData({
      domain: { name: 'UmbraAttestation', version: '1', chainId: await publicClient.getChainId(), verifyingContract: verifier.address },
      types: {
        NetDelta: [
          { name: 'epoch', type: 'uint256' },
          { name: 'netDelta', type: 'int256' },
          { name: 'intentCount', type: 'uint256' },
          { name: 'intentsCommitment', type: 'bytes32' },
        ],
      },
      primaryType: 'NetDelta',
      message: { epoch: 1n, netDelta: 100n, intentCount: 1n, intentsCommitment: commit1 },
    });
    await assert.rejects(
      vault.write.executeRebalance([100n, 1n, commit1, badSig, 0n]),
      /BadAttestation/,
    );
  });
});
