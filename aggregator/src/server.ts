import Fastify from 'fastify';
import { getAddress, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { EpochStore } from './store.ts';
import { signNetDelta } from './attestation.ts';
import { makeClient, readVault, isAuditor } from './chain.ts';

const PORT = Number(process.env.PORT ?? 8787);
const CHAIN_ID = 114;
const AGGREGATOR_KEY = process.env.AGGREGATOR_PRIVATE_KEY as Hex | undefined;
const VAULT = process.env.VAULT_ADDRESS as Address | undefined;
const VERIFIER = process.env.VERIFIER_ADDRESS as Address | undefined;
const KEEPER_SECRET = process.env.KEEPER_SECRET;

if (!AGGREGATOR_KEY || !VAULT || !VERIFIER) {
  throw new Error('Set AGGREGATOR_PRIVATE_KEY, VAULT_ADDRESS, VERIFIER_ADDRESS');
}

const signerAddress = privateKeyToAccount(AGGREGATOR_KEY).address;
const store = new EpochStore();
const client = makeClient(process.env.RPC_URL);
const app = Fastify({ logger: false });

app.get('/health', async () => ({ ok: true }));
app.get('/signer', async () => ({ signer: signerAddress }));

app.post('/intents', async (req, reply) => {
  const body = req.body as {
    epoch: string; delta: string; submitter: string; commitment: Hex;
  };
  const { manager, epoch } = await readVault(client, VAULT);
  if (getAddress(body.submitter) !== getAddress(manager)) {
    return reply.code(403).send({ error: 'not the vault manager' });
  }
  if (BigInt(body.epoch) !== epoch) {
    return reply.code(409).send({ error: 'epoch mismatch', current: epoch.toString() });
  }
  const result = store.addIntent(epoch, {
    delta: BigInt(body.delta),
    submitter: getAddress(body.submitter),
    commitment: body.commitment,
    ts: Date.now(),
  });
  return { intentCount: result.intentCount, commitment: result.commitment };
});

app.get('/net-delta/:epoch', async (req, reply) => {
  const { epoch } = req.params as { epoch: string };
  const viewer = (req.headers['x-viewer'] as string) ?? '';
  const { manager } = await readVault(client, VAULT);
  const allowed =
    !!viewer &&
    (getAddress(viewer) === getAddress(manager) ||
      (await isAuditor(client, VAULT, getAddress(viewer) as Address)));
  if (!allowed) return reply.code(403).send({ error: 'not authorized to view' });
  const e = BigInt(epoch);
  return { epoch, netDelta: store.netDelta(e).toString(), ...serialize(store.summary(e)) };
});

app.post('/attest/:epoch', async (req, reply) => {
  if (KEEPER_SECRET && req.headers['x-keeper-secret'] !== KEEPER_SECRET) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  const { epoch } = req.params as { epoch: string };
  const e = BigInt(epoch);
  const onchain = await readVault(client, VAULT);
  if (!onchain.epochClosed || onchain.epoch !== e) {
    return reply.code(409).send({ error: 'epoch not closed on-chain', current: onchain.epoch.toString() });
  }
  const summary = store.summary(e);
  const netDelta = store.netDelta(e);
  const signature = await signNetDelta(AGGREGATOR_KEY, CHAIN_ID, VERIFIER, {
    epoch: e,
    netDelta,
    intentCount: BigInt(summary.intentCount),
    intentsCommitment: summary.commitment,
  });
  return {
    epoch,
    netDelta: netDelta.toString(),
    intentCount: summary.intentCount,
    intentsCommitment: summary.commitment,
    signature,
  };
});

app.get('/strategy/:epoch', async (req, reply) => {
  const { epoch } = req.params as { epoch: string };
  const viewer = (req.headers['x-viewer'] as string) ?? '';
  if (!viewer || !(await isAuditor(client, VAULT, getAddress(viewer) as Address))) {
    return reply.code(403).send({ error: 'no auditor access' });
  }
  return { epoch, strategy: store.strategy(BigInt(epoch)) ?? null };
});

function serialize(s: { intentCount: number; commitment: string }) {
  return { intentCount: s.intentCount, commitment: s.commitment };
}

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`Umbra aggregator on :${PORT}, signer ${signerAddress}`);
});
