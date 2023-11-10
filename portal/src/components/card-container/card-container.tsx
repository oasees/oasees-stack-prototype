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
      btn_act: string
      }>
    >([]);

    useEffect(() => {
        const loadContracts = async () => {
          try {
            const itemCount = await marketplace.itemCount();
            const newItems: Array<{ desc: string; id: string; img_url: string; price: string; title: string,btn_act: string }> = [];

    
            if(showall){


              for (let i = 1; i <= itemCount; i++) {
                  const item = await marketplace.items(i)   
                  const uri = await nft.tokenURI(item.tokenId)


                  const config = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',

                    },
                    data: {},
                    params: {
                      "meta_hash": uri
                    }
                  }


                  const resp = await axios.get(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_fetch`, config);

                  const metadata = JSON.parse(resp.data.meta_info);

                  console.log(metadata)


                  const Price = await marketplace.getTotalPrice(item.itemId)
                  const price = ethers.formatEther(Price)
                  newItems.push({
                    desc: metadata.description,
                    id: item.itemId,
                    img_url: metadata.name,
                    price: price,
                    title: metadata.title,
                    btn_act: "Purchase"
                  })
                  
                }
                setItems(newItems);


            }else{

             
              const filter =  marketplace.filters.Bought(null,null,null,null,null,account)
              const results = await marketplace.queryFilter(filter)
              
              
              const purchases = await Promise.all(results.map(async (i: any) => {
               
                  i = i.args

                  const uri = await nft.tokenURI(i.tokenId)

                  const config = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',

                    },
                    data: {},
                    params: {
                      "meta_hash": uri
                    }
                  }

                  const resp = await axios.get(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_fetch`, config);
                  const metadata = JSON.parse(resp.data.meta_info);

                  

                  let purchasedItem = {
                    desc: metadata.description,
                    id: i.itemId,
                    img_url: metadata.name,
                    price: "",
                    title: metadata.title,
                    btn_act: "Open"
                  }


                return purchasedItem
              }))

              setItems(purchases);


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
                            btn_act: item.btn_act
                        }} marketplace={marketplace} nft={nft} account={account} showall={showall}
                    />
                ))}
            </div>
        </div>
    );
};
