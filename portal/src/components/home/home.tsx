import styles from './home.module.scss';
import classNames from 'classnames';
import { CardContainer } from '../card-container/card-container';
import { useEffect, useState } from 'react';
import axios from 'axios';
import DaoModal from './DaoModal';



export interface HomeProps {
    className?: string;
    marketplace: any;
    nft: any;
    account: any;
    signer:any;
    showall: any;
    daoStorageContract: any;
}


export interface CardProps {
    className?: string;
    account: any;
    signer: any;
    daoStorageContract: any;
    daojson: {
      devices: any;
      dao_name:string;
      dao_desc:string;
      governance_address:string; 
      governance_abi:any;
      governance_token_address:string;
      governance_token_abi:any;
      box_address:string;
      box_abi:any;
      dao_hash:string;
      icon_url:string;
    };
    openModal: () => void;


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
  
    
  
    return response.data.content;
  
  }

  export const Card = ({ className, account,signer,daojson,openModal}: CardProps) => {

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };
  
    const handleCloseModal = () => {
      setIsModalOpen(false);
    };



    return (
        <div className={classNames(styles.root, className)}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.imgBx}>
                        <img className={styles.asset_img} src="../images/dao_icon.png" />
                    </div>
                    <div className={styles.contentBx}>
                        <h2>{daojson.dao_name}</h2>

                        <button onClick={() => openModal()}>Manage</button>

                    </div>
                </div>
            </div>
        </div>
    );

};




export const Home = ({ className,marketplace,nft,account,signer,showall,daoStorageContract}: HomeProps) => {

    const [newItems, setNewItems] = useState<
      {
        devices: any;
        dao_name: string;
        dao_desc: string;
        governance_address: string;
        governance_abi: any;
        governance_token_address: string;
        governance_token_abi: any;
        box_address: string;
        box_abi: any;
        dao_hash: string;
        icon_url: string;
      }[]
    >([]);


    const load_Daos = async () => {

        try{


        const joined_daos = await marketplace.getJoinedDaos();


        const dao_array : Array<{ 
          devices: any;
          dao_name: string;
          dao_desc: string;
          governance_address: string;
          governance_abi: any;
          governance_token_address: string;
          governance_token_abi: any;
          box_address: string;
          box_abi: any;
          dao_hash: string;
          icon_url: string;}> = [];
  
  
        for (const dao_nft of joined_daos) {
  
        
          const dao_desc_hash = dao_nft[2];
          const dao_desc_content = await IpfsGet(dao_desc_hash);
          console.log(dao_desc_content);
  
          const dao_content_hash = await nft.tokenURI(dao_desc_content.dao_nft_id);
          console.log(dao_content_hash);
          const content = await IpfsGet(dao_content_hash);


  

          console.log("---->",content);


  
          dao_array.push({
            devices: content.devices,
            dao_name: content.dao_name,
            dao_desc: content.dao_desc,
            governance_address: content.governance_address,
            governance_abi: content.governance_abi,
            governance_token_address: content.token_address,
            governance_token_abi: content.token_abi,
            box_address: content.box_address,
            box_abi: content.box_abi,
            dao_hash: dao_content_hash,
            icon_url: "../images/dao_icon.png"
          })
  
          
  
        }  
        setNewItems(dao_array);
        }catch{}
  
    
      };
  
      useEffect(() => {

        
        load_Daos();
  
      }, [daoStorageContract]);
  
      const [isModalOpenArray, setIsModalOpenArray] = useState(
        newItems.map(() => false)
      );
    
  
      const handleOpenModal = (index: number) => {
        const newIsModalOpenArray = [...isModalOpenArray];
        newIsModalOpenArray[index] = true;
        setIsModalOpenArray(newIsModalOpenArray);
      };
    
      const handleCloseModal = (index: number) => {
        const newIsModalOpenArray = [...isModalOpenArray];
        newIsModalOpenArray[index] = false;
        setIsModalOpenArray(newIsModalOpenArray);
      };




    return (
        <div className={classNames(styles.root, className)}>
            <div>Joined Daos</div>
            <div className={classNames(styles.root, className)}>
        <div className={styles.subdiv}>
          {newItems.map((item, idx) => (
            <Card
              key={idx}
              account={account}
              signer={signer}
              daoStorageContract={daoStorageContract}
              daojson={{
                devices: item.devices,
                dao_name: item.dao_name,
                dao_desc: item.dao_desc,
                governance_address: item.governance_address, 
                governance_abi: item.governance_abi,
                governance_token_address: item.governance_token_address,
                governance_token_abi: item.governance_token_abi,
                box_address: item.box_address,
                box_abi: item.box_abi,
                dao_hash: item.dao_hash,
                icon_url: "../images/dao_icon.png"
              }}
              openModal={() => handleOpenModal(idx)}
            />
          ))}
          {isModalOpenArray.map((isOpen, idx) =>
            isOpen && (
              <DaoModal
                account={account}
                signer={signer}
                key={idx}
                daojson={newItems[idx]}
                onClose={() => handleCloseModal(idx)}
              />
            )
          )}
        </div>
      </div>
            {/* <div>Purchaced Services</div> */}
            {/* <CardContainer marketplace={marketplace} nft={nft} account={account} showall={showall} /> */}
            
        </div>



    );
};
