import styles from './dao-catalogue.module.scss';
import classNames from 'classnames';
import DaoModal from './DaoModal';

import React, { useEffect, useState } from "react";
import axios from 'axios';


export interface DaoCatalogueProps {
    className?: string;
    daoStorageHash: string;
    account:any;
    signer:any;
}


export interface CardProps {
    className?: string;
    account: any;
    signer: any;
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
                        <br></br>

                        <button onClick={() =>openModal()}>Proposals</button>

                    </div>
                </div>
            </div>
        </div>
    );

};

export const DaoCatalogue = ({ className ,daoStorageHash,account,signer}: DaoCatalogueProps) => {

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
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        params: {
          dao_storage_hash: daoStorageHash,
        },
      };

      try {
        const resp = await axios.get(`http://${process.env.REACT_APP_IPFS_API_HOST}/list_dao`, config);
        const daoList = resp.data.dao_list;


        console.log(daoList);


        if (Array.isArray(daoList)) {
          setNewItems(daoList);
        }
      } catch (error) {
        console.error('Error loading DAOs:', error);
      }
    };

    useEffect(() => {
      load_Daos();
    }, [daoStorageHash]);



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
    );
  };
  