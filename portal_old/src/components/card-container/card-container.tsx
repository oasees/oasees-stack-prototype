import styles from './card-container.module.scss';
import classNames from 'classnames';
import { Card } from '../card/card';
import { useEffect } from 'react';
import { useState } from 'react';
import { ethers } from "ethers"
import axios from 'axios';

export interface CardContainerProps {
    className?: string;
    marketplace: any;
    nft: any;
    account: any;
    showall: any;
  
}


export const CardContainer = ({ className,marketplace,nft,account,showall}: CardContainerProps) => {


    const [items, setItems] = useState<Array<{ 
      desc: string; 
      id: string;
      img_url: string; 
      price: string; 
      title: string;
      btn_act: string;
      nft_address: string;
      }>
    >([]);


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





    useEffect(() => {
        const loadContracts = async () => {
          try {
            const nft_items: Array<{ desc: string; id: string; img_url: string; price: string; title: string,btn_act: string, nft_address: string }> = [];
            const purchaced_items: Array<{ desc: string; id: string; img_url: string; price: string; title: string,btn_act: string, nft_address: string }> = [];


            if(showall){

              const available_nfts = await marketplace.getListedNfts();
          
              for (const item of available_nfts) {


                console.log(item[5])

                const content = JSON.parse(await IpfsGet(item[5]));


                 nft_items.push({
                    desc: content.description,
                    id: item[1],
                    img_url: "",
                    price: ethers.formatEther(item[4]),
                    title: content.title,
                    btn_act: "Purchase",
                    nft_address: item[0]
                  })
              }
              setItems(nft_items);

            
            }else{

              const user_nfts = await marketplace.getMyNfts();
              for (const item of user_nfts) {
                const content = JSON.parse(await IpfsGet(item[5]));   
         
                purchaced_items.push({
                  desc: content.description,
                  id: item[1],
                  img_url: "",
                  price:"",
                  title: content.title,
                  btn_act: "Open",
                  nft_address: item[0]
                })
                setItems(purchaced_items);

              }

            } 

            

          } catch (error) {
            console.error('Error loading contracts:', error);
          }
        };
    
        loadContracts();
      }, [marketplace, nft]);

    
    return (
        <div className={classNames(styles.root, className)}>
            <div className={styles.subdiv}>
                {items.map((item,idx) => (
                    <Card key={idx}
                        nftjson={{
                            desc: item.desc,
                            id: item.id,
                            img_url: item.img_url,
                            price: item.price,
                            title: item.title,
                            btn_act: item.btn_act,
                            nft_address: item.nft_address
                        }} marketplace={marketplace} nft={nft} account={account} showall={showall}
                    />
                ))}
            </div>
        </div>
    );
};
