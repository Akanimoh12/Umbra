import { encodeAbiParameters, keccak256, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// EIP-712 domain and type must match AttestationVerifier.sol exactly
export const DOMAIN_NAME = 'UmbraAttestation';
export const DOMAIN_VERSION = '1';

export const NET_DELTA_TYPES = {
  NetDelta: [
    { name: 'epoch', type: 'uint256' },
    { name: 'netDelta', type: 'int256' },
    { name: 'intentCount', type: 'uint256' },
    { name: 'intentsCommitment', type: 'bytes32' },
  ],
} as const;

// fold one intent into the running commitment: keccak(abi.encode(prev, intentCommitment))
// must match UmbraVault.submitIntent, seeded from bytes32(0)
export function foldCommitment(prev: Hex, intentCommitment: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }],
      [prev, intentCommitment],
    ),
  );
}

// per-intent commitment the manager also records on-chain via submitIntent
export function intentCommitment(delta: bigint, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters([{ type: 'int256' }, { type: 'bytes32' }], [delta, salt]),
  );
}

export function domain(chainId: number, verifyingContract: Address) {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId,
    verifyingContract,
  } as const;
}

export async function signNetDelta(
  aggregatorKey: Hex,
  chainId: number,
  verifyingContract: Address,
  message: { epoch: bigint; netDelta: bigint; intentCount: bigint; intentsCommitment: Hex },
): Promise<Hex> {
  const account = privateKeyToAccount(aggregatorKey);
  return account.signTypedData({
    domain: domain(chainId, verifyingContract),
    types: NET_DELTA_TYPES,
    primaryType: 'NetDelta',
    message,
  });
}
