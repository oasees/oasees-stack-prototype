import styles from './card.module.scss';
import classNames from 'classnames';
import { ethers } from 'ethers';

export interface CardProps {
    className?: string;
    nftjson: {
        id: string;
        title: string;
        img_url: string;
        desc: string;
        price: string;
        btn_act: string;
        nft_address: string;
    };

    marketplace: any;
    nft: any;
    account: any;
    showall: any;

}

export const Card = ({ className, nftjson,marketplace,nft,account,showall }: CardProps) => {


    const buyMarketItem = async (itemid:any,price:any,nft_address:string) => {
        try{
            const buyItem_transaction = await marketplace.buyNft(nft_address,itemid, { value: ethers.parseEther(price.toString()) });
            const buyItem_receipt = await buyItem_transaction.wait();

        }
        catch(error){
            console.log("Metamask error",error);

        } 
      
    }



    if(showall){


        return (
            <div className={classNames(styles.root, className)}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.imgBx}>
                            <img className={styles.asset_img} src="../images/samples/dataset.png" />
                        </div>
                        <div className={styles.contentBx}>
                            <h2>{nftjson.title}</h2>
                            <h4>{nftjson.price}</h4>
                            <button onClick={() => buyMarketItem(nftjson.id,nftjson.price,nftjson.nft_address)}>{nftjson.btn_act}</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }else{

        return (
            <div className={classNames(styles.root, className)}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.imgBx}>
                            <img className={styles.asset_img} src="../images/samples/dataset.png" />
                        </div>
                        <div className={styles.contentBx}>
                            <h2>{nftjson.title}</h2>
                            <h4>{nftjson.price}</h4>
                            <button >{nftjson.btn_act}</button>
                        </div>
                    </div>
                </div>
            </div>
        );




    }
};
