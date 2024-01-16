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
    nft:any;
}


export interface CardProps {
    className?: string;
    account: any;
    signer: any;
    daoStorageContract: any;
    nft:any;
    daojson: {
      dao_name:string;
      dao_desc:string;
      dao_nft_id: BigInt;
      governance_address:string; 
      governance_abi:any;
      token_provider_address:string;
      token_provider_abi:any;
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





export const Card = ({ className, account,signer,daojson,daoStorageContract,nft,openModal}: CardProps) => {

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };
  
    const handleCloseModal = () => {
      setIsModalOpen(false);
    };




    const joinDao = async (daojson:any,daoStorageContract:any) =>{


      console.log(daojson.token_provider_address);
      // await daoStorageContract.addHash(daojson.dao_hash);

 
      const join_dao_payload = { 
        user: account,
        token_address: daojson.governance_token_address,
        token_abi: daojson.governance_token_abi
        
    };

      // const response = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/transfer_tokens`, join_dao_payload);
      // console.log(response.data);

      const dao_token_provider_contract = new ethers.Contract(
        daojson.token_provider_address, 
        daojson.token_provider_abi,
        signer)

      const get_tokens_transaction = await dao_token_provider_contract.getTokens(
        {
          gasLimit: 2000000,
          gasPrice:100
        }


      );
      const get_token_receipt = await get_tokens_transaction.wait();

      const join_transaction = await daoStorageContract.joinDao(daojson.dao_nft_id);
      const get_join_receipt = await join_transaction.wait();





      // const delegate_transaction = await dao_token_contract.delegate(signer);
      // const delegate_receipt = await delegate_transaction.wait();


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

export const DaoCatalogue = ({ className ,daoIndexerContract,account,signer,daoStorageContract,nft}: DaoCatalogueProps) => {

    const [newItems, setNewItems] = useState<
      {
        dao_name: string;
        dao_desc: string;
        dao_nft_id: BigInt;
        governance_address: string;
        governance_abi: any;
        token_provider_address:string;
        token_provider_abi:any;
        governance_token_address: string;
        governance_token_abi: any;
        box_address: string;
        box_abi: any;
        dao_hash: string;
        icon_url: string;
      }[]
    >([]);

    const load_Daos = async () => {

      const available_daos = await daoIndexerContract.getlistedDaos();

      const dao_array : Array<{ 
        dao_name: string;
        dao_desc: string;
        dao_nft_id: BigInt;
        governance_address: string;
        governance_abi: any;
        token_provider_address:string;
        token_provider_abi:any;
        governance_token_address: string;
        governance_token_abi: any;
        box_address: string;
        box_abi: any;
        dao_hash: string;
        icon_url: string;}> = [];


        // const joined = await daoIndexerContract.getJoinedDaos();
        // for (const dao_nft of joined)
        //   console.log(dao_nft)


      for (const dao_nft of available_daos) {


        console.log("->>",dao_nft);
        // console.log("->>",dao_nft[2]);
        const dao_desc_hash = dao_nft[2];
        const dao_desc_content = await IpfsGet(dao_desc_hash);
        console.log(dao_desc_content);

        const dao_content_hash = await nft.tokenURI(dao_desc_content.dao_nft_id);
        console.log(dao_content_hash);
        const content = await IpfsGet(dao_content_hash);

        console.log(content.token_provider_address);
        // console.log(content.dao_desc);


        dao_array.push({
          dao_name: content.dao_name,
          dao_desc: content.dao_desc,
          dao_nft_id:dao_desc_content.dao_nft_id,
          governance_address: content.governance_address,
          governance_abi: content.governance_abi,
          governance_token_address: content.token_address,
          token_provider_address:content.token_provider_address,
          token_provider_abi:content.token_provider_abi,
          governance_token_abi: content.token_abi,
          box_address: content.box_address,
          box_abi: content.box_abi,
          dao_hash: dao_content_hash,
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
              nft={nft}
              daojson={{
                dao_name: item.dao_name,
                dao_desc: item.dao_desc,
                dao_nft_id: item.dao_nft_id,
                governance_address: item.governance_address, 
                governance_abi: item.governance_abi,
                token_provider_address:item.token_provider_address,
                token_provider_abi:item.token_provider_abi,
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
  