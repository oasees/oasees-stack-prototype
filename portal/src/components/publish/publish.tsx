import styles from './publish.module.scss';
import {Alert, Modal, StyleSheet, Text, Pressable, View} from 'react-native';
import classNames from 'classnames';
import { useState ,useEffect} from 'react'
import { ethers } from 'ethers';
import MarketplaceAddress from '../../contractsData/Marketplace-address.json';
import NFTaddress from '../../contractsData/NFT-address.json'
import axios from 'axios';
import FormData from 'form-data';

export interface PublishProps {
    className?: string;
    marketplace: any;
    nft: any;
    account: any;
}

export const Publish = ({ className,marketplace,nft,account}: PublishProps) => {


    const [file, setFile] = useState<File|string>('');
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [formError, setFormError] = useState<boolean>(false);

    const [modalVisible, setModalVisible] = useState(false);


    useEffect(() => {
      const dropContainer = document.getElementById('dropcontainer');
      const fileInput = document.getElementById('asset');
  
      const handleDragOver = (e:any) => {
        e.preventDefault();
      };
  
      const handleDragEnter = () => {
        dropContainer?.classList.add('drag_active');
      };
  
      const handleDragLeave = () => {
        dropContainer?.classList.remove('drag_active');
      };
  
      const handleDrop = (e:any) => {
        e.preventDefault();
        dropContainer?.classList.remove('drag_active');
        if (fileInput) {
          setFile(e.dataTransfer.files);
        }
      };
  
      dropContainer?.addEventListener('dragover', handleDragOver, false);
      dropContainer?.addEventListener('dragenter', handleDragEnter);
      dropContainer?.addEventListener('dragleave', handleDragLeave);
      dropContainer?.addEventListener('drop', handleDrop);
  
      return () => {
        dropContainer?.removeEventListener('dragover', handleDragOver, false);
        dropContainer?.removeEventListener('dragenter', handleDragEnter);
        dropContainer?.removeEventListener('dragleave', handleDragLeave);
        dropContainer?.removeEventListener('drop', handleDrop);
      };
    }, []);



    


    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        setFile(selectedFile || '');
      };
    
      const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedTitle = event.target.value;
        setTitle(updatedTitle);
      };
    
      const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedDescription = event.target.value;
        setDescription(updatedDescription);
      };
    
      const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedPrice = event.target.value;
        setPrice(updatedPrice);
      };
    
      const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    
        if (!file || !title || !description || !price) {
          setFormError(true);
          return;
        }
        setFormError(false);
        try {
            var ifs_data = new FormData();
          
            ifs_data.append("asset", file);
            ifs_data.append("meta",JSON.stringify({price, title, description}));
  
  
            const meta_hash = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_upload`, ifs_data, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })


            console.log(meta_hash.data.meta_hash)

            mintThenList(meta_hash.data.meta_hash)




          } catch (error) {
            console.log("Submit error: ", error)
          }

      };


      const mintThenList = async (nft_meta:string) => {

        try{
          await(await nft.mint(nft_meta)).wait()

          const id = await nft.tokenCount()

          await(await nft.setApprovalForAll(MarketplaceAddress.address, true)).wait()
          const listingPrice = ethers.parseEther(price.toString())
          await(await marketplace.makeItem(NFTaddress.address, id, listingPrice,50)).wait()
        }catch(error){
          console.log("Metamask error",error)
        }
      }
      

      const styles_modal = StyleSheet.create({
        centeredView: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 22,
        },
        modalView: {
          margin: 20,
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 35,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        },
        button: {
          borderRadius: 20,
          padding: 10,
          elevation: 2,
        },
        buttonOpen: {
          backgroundColor: '#F194FF',
        },
        buttonClose: {
          backgroundColor: '#2196F3',
        },
        textStyle: {
          color: 'white',
          fontWeight: 'bold',
          textAlign: 'center',
        },
        modalText: {
          marginBottom: 15,
          textAlign: 'center',
        },
      });


      const cardImageStyle = {
        borderRadius: '8px',
        overflow: 'hidden',
        paddingBottom: '65%',
        // backgroundImage: `url(${localImage})`, // Use the imported local image
        backgroundRepeat: 'no-repeat',
        backgroundSize: '150%',
        backgroundPosition: '0 5%',
        position: 'relative',
        maxWidth: '25vw',
        display: 'block',
      };



      

    return (
        <div className={classNames(styles.root, className)}>
            <div className={styles.form_container}>
              <div className={styles.card}>
                <div className={styles.cardImageStyle}>  
                  <h2 className={styles.card_heading}>
                    Upload Asset to Oasees
                  </h2>
                </div>
                <form className={styles.card_form}>
                  <div  className={styles.input}>
                    <input onChange={handleTitleChange} type="text" className={styles.input_field}  required/>
                    <p className={styles.input_label}>Title</p>
                  </div>
                    <div className={styles.input}>
                    <input onChange={handleDescriptionChange} type="text" className={styles.input_field} required/>
                    <p className={styles.input_label}>Description</p>
                  </div>
                    <div className={styles.input}>
                      <input onChange={handlePriceChange} type="number" className={styles.input_field} required/>
                      <p className={styles.input_label}>Price</p>
                    </div>
                  <div className={styles.drop_container} id="dropcontainer">
                    <span className="drop-title">Drop files here</span>
                    or
                    <input onChange={handleFileUpload} id="asset" className={styles.input} type="file" required/>
                  </div>

                  <div className={styles.action}>
                    <button  onClick={handleSubmit} className={styles.action_button}>Upload</button>
                  </div>
         
         
         
                </form>



              </div>
            </div>



        </div>
    );
};
