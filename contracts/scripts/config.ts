import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deploymentsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'deployments',
  'coston2.json',
);

export interface Deployments {
  testUSD?: `0x${string}`;
  testXAU?: `0x${string}`;
  factory?: `0x${string}`;
  router?: `0x${string}`;
  pair?: `0x${string}`;
  attestationVerifier?: `0x${string}`;
  umbraVault?: `0x${string}`;
  manager?: `0x${string}`;
  keeper?: `0x${string}`;
  aggregatorSigner?: `0x${string}`;
}

export function readDeployments(): Deployments {
  if (!existsSync(deploymentsPath)) return {};
  return JSON.parse(readFileSync(deploymentsPath, 'utf8'));
}

export function saveDeployments(update: Partial<Deployments>): Deployments {
  const next = { ...readDeployments(), ...update };
  mkdirSync(dirname(deploymentsPath), { recursive: true });
  writeFileSync(deploymentsPath, JSON.stringify(next, null, 2) + '\n');
  console.log('deployments/coston2.json updated:', update);
  return next;
}
