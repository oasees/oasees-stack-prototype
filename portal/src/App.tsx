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
    const [daoIndexerContract, setDaoIndexerContract] = useState({})
    const [daoStorageContract, setDaoStorageContract] = useState({})
    const [isConnecting,setIsConnecting] = useState(false)
    


    const new_user = async (portal_contracts_info:any,signer:any,account:any) =>{

        const accountToken_bytecode = portal_contracts_info.accountToken_bytecode;
        const accountToken_abi = portal_contracts_info.accountToken_abi;

        const accountToken_contract_fact = new ethers.ContractFactory(accountToken_abi,accountToken_bytecode,signer);

        var accountToken_address ='';
        try {
            const accountToken_contract = await accountToken_contract_fact.deploy(signer);
        
            accountToken_address = await accountToken_contract.getAddress();
        
          } catch (error) {
            console.error('Error deploying contract:', error);
          }

          
          const daoStorage_bytecode = portal_contracts_info.daoStorage_bytecode;
          const daoStorage_abi = JSON.stringify(portal_contracts_info.daoStorage_abi);
  
          const daoStorage_contract_fact = new ethers.ContractFactory(daoStorage_abi,daoStorage_bytecode,signer);

          var daoStorage_address='';

          try {
            const daoStorage_contract = await daoStorage_contract_fact.deploy(signer);
        
            daoStorage_address = await daoStorage_contract.getAddress();
        
          } catch (error) {
            console.error('Error deploying contract:', error);
          }


            const new_user_payload = { 
                user: account,
                account_token_address: accountToken_address,
                daoStorage_address:daoStorage_address 
                
            };

            const newUserResponse = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/new_user`, new_user_payload);
            
            const account_hash = newUserResponse.data.account_hash;
            // console.log(account_hash);



            const account_token_contract = new ethers.Contract(
                accountToken_address, 
                accountToken_abi, 
                signer)
    
            const mint_transaction = await account_token_contract.mint(account_hash);
            const mint_receipt = await mint_transaction.wait();
    
    
    
            const p = await account_token_contract.tokenURI(1);
    
            console.log(p);


          return accountToken_address;


    }


    async function IpfsGet(_ipfs_hash:string){

        const config = {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
  
          },
          data: {},
          params: {
            "ipfs_hash": _ipfs_hash
          }
        }
  
  
        const response = await axios.get(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_fetch`,config);
  
        
  
        return JSON.parse(response.data.content);
  
      }


    const connectToMetaMask = async () => {

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if(!isConnected){
            
            setAccount(accounts[0])

            const account = accounts[0]

            const provider = new ethers.BrowserProvider(window.ethereum);

            
            setPRovider(provider);
        

            const signer = await provider.getSigner();
            setSinger(signer);

            console.log(process.env.REACT_APP_INFRA_HOST);


            const resp = await axios.get(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_portal_contracts`, {});
            const market_contracts_info = resp.data.portal_contracts;


            const account_payload = { user: account };
            const user_exists = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/user_exists`, account_payload);

            const notebookUrl = "";

            var account_token_address=""


            if(!user_exists.data.exists){
                setIsConnecting(true);
                account_token_address = await new_user(market_contracts_info,signer,account);
                setIsConnecting(false);
            }else{
                account_token_address = user_exists.data.ipfs_hash;
            } 

            const account_token_contract = new ethers.Contract(
                account_token_address, 
                market_contracts_info.accountToken_abi, 
                signer)
            

            const account_hash = await account_token_contract.tokenURI(1);
            const content = await IpfsGet(account_hash);
            console.log(content.daoStorage_address);
            console.log(content.jupyter_url);

            const daoStorage_contract = new ethers.Contract(
                content.daoStorage_address, 
                market_contracts_info.daoStorage_abi, 
                signer)


            setDaoStorageContract(daoStorage_contract);
        
            setNoteBookURL(content.jupyter_url);



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


    const loadContracts = async (signer:any,market_contracts_info:any) => {

        // console.log("Marketplace address",market_contracts_info.marketplace_address);
        // console.log("NFT address",market_contracts_info.nft_address);
        // console.log("DAO indexer address",market_contracts_info.dao_indexer_address);

        const marketplace = new ethers.Contract(
            market_contracts_info.marketplace_address, 
            market_contracts_info.marketplace_abi, 
            await signer)
    

        setMarketplace(marketplace)

        const nft = new ethers.Contract(
            market_contracts_info.nft_address,
            market_contracts_info.nft_abi,
            await signer)
    
        setNFT(nft)

        const daoIndexer = new ethers.Contract(
            market_contracts_info.dao_indexer_address,
            market_contracts_info.dao_indexer_abi,
            await signer)


        setDaoIndexerContract(daoIndexer);

        
      }



    const handleTabClick = (tabName: string) => {
        setActiveTab(tabName);
    };

    const renderTabComponent = () => {
        switch (activeTab) {
            case 'Home':
                return <Home marketplace={marketplace} nft={nft} account={account} signer={signer} showall={false} daoStorageContract={daoStorageContract}/>;
            case 'Service Catalogue':
                return <ServiceCatalogue marketplace={marketplace} nft={nft} account={account} showall={true}/>;
            case 'DAO Catalogue':
                return <DaoCatalogue account={account} signer={signer} daoIndexerContract={daoIndexerContract} daoStorageContract={daoStorageContract}/>;
            case 'Publish':
                return <Publish marketplace={marketplace} nft={nft} account={account}/>;
            case 'Notebooks':
                return <Notebooks notebook_url={notebook_url}/>;
            case 'Create DAO':
                return <DaoCreate account={account} daoIndexerContract={daoIndexerContract}/>;
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
                    {!isConnecting &&
                    <button className={`${styles.btn_connect} ${isConnected ? styles.btn_disconnect : ''}`} onClick={connectToMetaMask} >
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                    }


                </div>
                <div className={styles.tabpanel}>{renderTabComponent()}</div>

                <div className={styles.area} >

            </div >

            </div>
        </div>
    );
}

export default App;
