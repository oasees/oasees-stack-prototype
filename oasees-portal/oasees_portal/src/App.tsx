import React, { useState, useEffect } from 'react';
import './App.css';
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css';
import Landing from './components/landing-page/Landing';
import Portal from './components/portal-layout/Portal';
import { ethers } from "ethers";
import axios from 'axios';


export const UserContext = React.createContext(null);

declare global {
  interface Window {
    ethereum: any;
  }
}



interface ConnectionInfo {
  account: string;
  provider: ethers.providers.Web3Provider;
  marketplace: ethers.Contract;
  nft: ethers.Contract;
  callProvider: ethers.providers.JsonRpcProvider;
}



function App() {

  const [isConnected,setIsConnected] = useState(false);
  const [info, setInfo]=useState<ConnectionInfo | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum === 'undefined') return;

      const savedConnectionData = localStorage.getItem('oaseesConnection');
      if (!savedConnectionData) return;

      try {
        const connectionData = JSON.parse(savedConnectionData);
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });

        if (accounts.length > 0 && accounts[0] === connectionData.account) {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = await provider.getSigner();
          const callProvider = new ethers.providers.JsonRpcProvider(
            `http://${process.env.REACT_APP_BLOCKCHAIN_HOST}:8545`,
            undefined
          );

          const marketplace = new ethers.Contract(
            connectionData.marketplace_address,
            connectionData.marketplace_abi,
            await signer
          );

          const nft = new ethers.Contract(
            connectionData.nft_address,
            connectionData.nft_abi,
            await signer
          );

          setInfo({
            account: accounts[0],
            provider,
            marketplace,
            nft,
            callProvider
          });
          setIsConnected(true);
        } else {
          localStorage.removeItem('oaseesConnection');
        }
      } catch (error) {
        console.error('Error restoring connection:', error);
        localStorage.removeItem('oaseesConnection');
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    if (isConnected && info?.account) {
      const connectionData = {
        account: info.account,
        marketplace_address: info.marketplace.address,
        marketplace_abi: info.marketplace.interface.format(ethers.utils.FormatTypes.json),
        nft_address: info.nft.address,
        nft_abi: info.nft.interface.format(ethers.utils.FormatTypes.json)
      };
      localStorage.setItem('oaseesConnection', JSON.stringify(connectionData));
    }
  }, [isConnected, info]);

  const disconnect = async () => {
    await window.ethereum.request({
      "method": "wallet_revokePermissions",
      "params": [
       {
         eth_accounts: {}
       }
     ],
     });
    localStorage.removeItem('oaseesConnection');
    setIsConnected(false);
  }

  return (
    <>
      {isConnected?
        <Portal json={info} setIsConnected={disconnect} setInfo={setInfo}/> :
        <Landing setInfo={setInfo} setIsConnected={setIsConnected}/>
      }
    </>
  );
}

export default App;
