import { createPublicClient, http, type Address } from 'viem';
import { flareTestnet } from 'viem/chains';

const vaultAbi = [
  { type: 'function', name: 'manager', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'keeper', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'epoch', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'epochClosed', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'isAuditor', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }] },
] as const;

export function makeClient(rpcUrl?: string) {
  return createPublicClient({ chain: flareTestnet, transport: http(rpcUrl) });
}

export async function readVault(
  client: ReturnType<typeof makeClient>,
  vault: Address,
) {
  const [manager, keeper, epoch, epochClosed] = await Promise.all([
    client.readContract({ address: vault, abi: vaultAbi, functionName: 'manager' }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: 'keeper' }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: 'epoch' }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: 'epochClosed' }),
  ]);
  return { manager, keeper, epoch, epochClosed };
}

export async function isAuditor(
  client: ReturnType<typeof makeClient>,
  vault: Address,
  addr: Address,
): Promise<boolean> {
  return client.readContract({ address: vault, abi: vaultAbi, functionName: 'isAuditor', args: [addr] });
}
