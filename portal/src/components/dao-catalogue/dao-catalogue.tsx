import styles from './dao-catalogue.module.scss';
import classNames from 'classnames';
import DaoModal from './DaoModal';

import React, { useEffect, useState } from "react";
import axios from 'axios';
import { ethers } from 'ethers';


export interface DaoCatalogueProps {
    className?: string;
    daoIndexerContract: any;
    daoStorageContract: any;
    account:any;
    signer:any;
}


export interface CardProps {
    className?: string;
    account: any;
    signer: any;
    daoStorageContract: any;
    daojson: {
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





export const Card = ({ className, account,signer,daojson,daoStorageContract,openModal}: CardProps) => {

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };
  
    const handleCloseModal = () => {
      setIsModalOpen(false);
    };




    const joinDao = async (daojson:any,daoStorageContract:any) =>{


      console.log(daojson.dao_hash);
      await daoStorageContract.addHash(daojson.dao_hash);

 
      const join_dao_payload = { 
        user: account,
        token_address: daojson.governance_token_address,
        token_abi: daojson.governance_token_abi
        
    };

      const response = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/transfer_tokens`, join_dao_payload);
      console.log(response.data);

      const dao_token_contract = new ethers.Contract(
        daojson.governance_token_address, 
        daojson.governance_token_abi,
        signer)

      const delegate_transaction = await dao_token_contract.delegate(signer);
      const delegate_receipt = await delegate_transaction.wait();


    }


    return (
        <div className={classNames(styles.root, className)}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.imgBx}>
                        <img className={styles.asset_img} src="../images/dao_icon.png" />
                    </div>
                    <div className={styles.contentBx}>
                        <h2>{daojson.dao_name}</h2>
                        <br></br>

                        <button onClick={() =>joinDao(daojson,daoStorageContract)}>Join Dao</button>

                    </div>
                </div>
            </div>
        </div>
    );

};

export const DaoCatalogue = ({ className ,daoIndexerContract,account,signer,daoStorageContract}: DaoCatalogueProps) => {

    const [newItems, setNewItems] = useState<
      {
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

      const available_daos = await daoIndexerContract.getStoredHashes();

      const dao_array : Array<{ 
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


      for (const dao_hash of available_daos) {

        console.log("->>",dao_hash);
        
        const content = await IpfsGet(dao_hash);

        console.log(content.dao_name);
        console.log(content.dao_desc);


        dao_array.push({
          dao_name: content.dao_name,
          dao_desc: content.dao_desc,
          governance_address: content.governance_address,
          governance_abi: content.governance_abi,
          governance_token_address: content.token_address,
          governance_token_abi: content.token_abi,
          box_address: content.box_address,
          box_abi: content.box_abi,
          dao_hash: dao_hash,
          icon_url: "../images/dao_icon.png"
        })

        

      }  
      setNewItems(dao_array);

  
    };

    useEffect(() => {
      load_Daos();
    }, [daoIndexerContract]);



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
        <div className={styles.subdiv}>
          {newItems.map((item, idx) => (
            <Card
              key={idx}
              account={account}
              signer={signer}
              daoStorageContract={daoStorageContract}
              daojson={{
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
              // joinDao={()=> (idx)}
              openModal={() => (idx)}
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
    );
  };
  