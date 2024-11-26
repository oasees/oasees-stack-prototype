import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'SynpressIsAwesomeNow!!!'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  

  await metamask.importWallet(SEED_PHRASE)
  await metamask.importWalletFromPrivateKey('0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61')

  const customNetwork = {
    name: 'oasees',
    rpcUrl: 'http://10.160.1.205:8545',
    chainId: 31337,
    symbol: 'ETH'
  }

  // Add the custom network to MetaMask
  await metamask.addNetwork(customNetwork)

})