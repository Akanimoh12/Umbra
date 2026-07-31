export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ??
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const umbraVaultAbi = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }], outputs: [{ name: 'shares', type: 'uint256' }] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ name: 'assets', type: 'uint256' }] },
  { type: 'function', name: 'totalAssets', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'sharePrice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'baseAsset', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'targetAsset', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'manager', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'keeper', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'epoch', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'epochClosed', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'epochIntentCount', stateMutability: 'view', inputs: [{ name: 'epoch', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'epochIntentsCommitment', stateMutability: 'view', inputs: [{ name: 'epoch', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'isAuditor', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'submitIntent', stateMutability: 'nonpayable', inputs: [{ name: 'intentCommitment', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'closeEpoch', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'executeRebalance', stateMutability: 'nonpayable', inputs: [{ name: 'netDelta', type: 'int256' }, { name: 'intentCount', type: 'uint256' }, { name: 'intentsCommitment', type: 'bytes32' }, { name: 'signature', type: 'bytes' }, { name: 'amountOutMinimum', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'grantAuditor', stateMutability: 'nonpayable', inputs: [{ name: 'auditor', type: 'address' }], outputs: [] },
  { type: 'function', name: 'revokeAuditor', stateMutability: 'nonpayable', inputs: [{ name: 'auditor', type: 'address' }], outputs: [] },
  { type: 'event', name: 'Deposited', inputs: [{ name: 'lp', type: 'address', indexed: true }, { name: 'assets', type: 'uint256', indexed: false }, { name: 'shares', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'IntentSubmitted', inputs: [{ name: 'epoch', type: 'uint256', indexed: true }, { name: 'intentCount', type: 'uint256', indexed: false }, { name: 'intentCommitment', type: 'bytes32', indexed: false }] },
  { type: 'event', name: 'EpochClosed', inputs: [{ name: 'epoch', type: 'uint256', indexed: true }, { name: 'intentCount', type: 'uint256', indexed: false }, { name: 'intentsCommitment', type: 'bytes32', indexed: false }] },
  { type: 'event', name: 'RebalanceExecuted', inputs: [{ name: 'epoch', type: 'uint256', indexed: true }, { name: 'netDelta', type: 'int256', indexed: false }, { name: 'amountOut', type: 'uint256', indexed: false }] },
] as const;

export const erc20Abi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'faucet', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;
