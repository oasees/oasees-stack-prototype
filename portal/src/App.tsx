import styles from './App.module.scss';
import React, { useState, useEffect } from 'react';
import { SideMenu } from './components/side-menu/side-menu';
import { Home } from './components/home/home';
import { ServiceCatalogue } from './components/service-catalogue/service-catalogue';
import { DaoCatalogue } from './components/dao-catalogue/dao-catalogue';
import { Publish } from './components/publish/publish';
import { Notebooks } from './components/notebooks/notebooks';
import { DaoCreate } from './components/dao-create/dao-create';
import { VoidSigner, ethers } from "ethers"
import axios from 'axios';


declare global {
    interface Window {
      ethereum: any;
    }
  }


function App() {
    const [activeTab, setActiveTab] = useState('Home');
    const [isConnected, setIsConnected] = useState(false);

    const [account, setAccount] = useState({})
    const [signer, setSinger] = useState({})
    const [provider, setPRovider] = useState({})
    const [nft, setNFT] = useState({})
    const [marketplace, setMarketplace] = useState({})
    const [notebook_url, setNoteBookURL] = useState("")
    const [daoStorageHash, setDaoStorageHash] = useState("")


    const connectToMetaMask = async () => {

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if(!isConnected){
            
            setAccount(accounts[0])

            const account = accounts[0]

            const provider = new ethers.BrowserProvider(window.ethereum);
            setPRovider(provider);
        
            const signer = provider.getSigner();
            setSinger(signer);


            const payload = { user: account };
   

            console.log(process.env.REACT_APP_INFRA_HOST);
            const notebookUrlResponse = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/user_login`, payload);

            const notebookUrl = notebookUrlResponse.data.url;
            const daoStorageHash = notebookUrlResponse.data.dao_storage_hash;
            console.log(daoStorageHash);


            setNoteBookURL(notebookUrl);
            setDaoStorageHash(daoStorageHash);
            const resp_contr = await axios.get(`http://${process.env.REACT_APP_IPFS_API_HOST}/get_marketplace_ipfs_hash`,{});

            const ipfs_hash = resp_contr.data.ipfs_hash;
           
            console.log(ipfs_hash);

            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',

                },
                data: {},
                params: {
                  "ipfs_hash": ipfs_hash
                }
              }

            const resp = await axios.get(`http://${process.env.REACT_APP_IPFS_API_HOST}/ipfs_contracts_marketplace`, config);
            const market_contracts_info = resp.data.marketplace;


            window.ethereum.on('chainChanged', (chainId:string) => {
                window.location.reload();

            })
        
            window.ethereum.on('accountsChanged', async function (accounts:string[]) {
                setAccount(accounts[0])
                await connectToMetaMask()
            })

            setIsConnected(true);
            loadContracts(signer,market_contracts_info)


        }else{
            
            setAccount({});
            setIsConnected(false);
            console.log("DISCONNECT!!!")
     
        }
    }


    const loadContracts = async (signer:Promise<ethers.JsonRpcSigner>,market_contracts_info:any) => {

        // console.log(market_contracts_info.marketplace_address);
        // console.log(market_contracts_info.nft_address);
        // console.log("-----------")

        // console.log(market_contracts_info.nft_abi.abi)

        const marketplace = new ethers.Contract(
            market_contracts_info.marketplace_address, 
            market_contracts_info.marketplace_abi.abi, 
            await signer)
    



        setMarketplace(marketplace)

        const nft = new ethers.Contract(
            market_contracts_info.nft_address,
            market_contracts_info.nft_abi.abi,
            await signer)
    
        setNFT(nft)

        
      }



    const handleTabClick = (tabName: string) => {
        setActiveTab(tabName);
    };

    const renderTabComponent = () => {
        switch (activeTab) {
            case 'Home':
                return <Home marketplace={marketplace} nft={nft} account={account} showall={false}/>;
            case 'Service Catalogue':
                return <ServiceCatalogue marketplace={marketplace} nft={nft} account={account} showall={true}/>;
            case 'DAO Catalogue':
                return <DaoCatalogue account={account} signer={provider} daoStorageHash={daoStorageHash}/>;
            case 'Publish':
                return <Publish marketplace={marketplace} nft={nft} account={account}/>;
            case 'Notebooks':
                return <Notebooks notebook_url={notebook_url}/>;
            case 'Create DAO':
                return <DaoCreate account={account} daoStorageHash={daoStorageHash}/>;
            default:
                return null;
        }
    };



    useEffect(() => {
        const buttonElement = document.querySelector('.connectbtn');
        
        if (buttonElement) {
          if (isConnected) {
            buttonElement.setAttribute('class', `${styles.connectbtn} connected`);
          } else {
            buttonElement.setAttribute("style", "color:red; border: 1px solid blue;");
          }
        }
      }, [isConnected]);






    return (
        <div className={styles.App}>
            <div className={styles.sidecontainer}>
                <SideMenu onTabClick={handleTabClick} activeTab={activeTab} />
            </div>
            <div className={styles.genralpanel}>
                <div className={styles.navbar}>


                    <div className={styles.search_box}>
                        <button className={styles.btn_search}><i className={styles.icon_search}></i></button>
                        <input type="text" className={styles.input_search} placeholder="Search..."/>
                    </div>

                    <button className={`${styles.btn_connect} ${isConnected ? styles.btn_disconnect : ''}`} onClick={connectToMetaMask} >
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </button>


                </div>
                <div className={styles.tabpanel}>{renderTabComponent()}</div>

                <div className={styles.area} >

            </div >

            </div>
        </div>
    );
}

export default App;
