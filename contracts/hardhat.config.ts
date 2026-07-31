import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';
import { configVariable, defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: '0.8.35',
  networks: {
    default: {
      type: 'edr-simulated',
      allowUnlimitedContractSize: true,
    },
    coston2: {
      type: 'http',
      url: configVariable('COSTON2_RPC'),
      accounts: [configVariable('PK')],
      chainId: 114,
    },
  },
});
