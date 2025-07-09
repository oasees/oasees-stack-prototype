import React, { useState } from 'react';
import './App.css';
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css';
import Landing from './components/landing-page/Landing';
import Portal from './components/portal-layout/Portal';


export const UserContext = React.createContext(null);



function App() {

  const [isConnected,setIsConnected] = useState(false);
  const [info, setInfo]=useState({});

  const disconnect = async () => {
    await window.ethereum.request({
      "method": "wallet_revokePermissions",
      "params": [
       {
         eth_accounts: {}
       }
     ],
     });
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
