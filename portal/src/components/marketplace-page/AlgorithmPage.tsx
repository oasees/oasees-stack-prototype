import { Card, Center, Image, Button, Stack, LoadingOverlay, Loader, Text, Flex, Grid, Container, Group, Pill, Modal, UnstyledButton} from "@mantine/core";
import { useState } from "react";
import axios from "axios";
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import styles from './ItemPage.module.css'
import './ItemPage.css'
import { ethers } from "ethers";
import 'katex/dist/katex.min.css';
import { NftItem } from "src/types/interfaces";


interface AlgorithmPageProps{
    json:any;
    changePage:(n:number)=>void;
    currentAlgorithm: NftItem;
    algHandlers?:any;
    isPurchased: boolean;
}


const ipfs_get = async (ipfs_hash:string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_IPFS_HOST}/api/v0/cat?arg=` + ipfs_hash);
    return response; 
  }

const ipfs_download = async (ipfs_hash:string) => {
    const response = await axios.get(`http://${process.env.REACT_APP_IPFS_HOST?.split(":")[0]}:8080/ipfs/` + ipfs_hash, {
        responseType: 'blob', // Important for downloading files
    });

    return response;
}


const AlgorithmPage = ({json,changePage,currentAlgorithm,algHandlers,isPurchased}:AlgorithmPageProps ) => {

    const [loading,setLoading] = useState(false);
    const [showPurchaseComplete, setShowPurchaseComplete] = useState(false);
    const [showPurchaseFailed, setShowPurchaseFailed] = useState(false);


    const purchase_algorithm = async (marketplace_id:string, price:string) => {
        // console.log(`http://${json.main_cluster_ip}:31007`)
        
        const master_ip = json.main_cluster_ip;
        // const master_ip = "10.160.1.209";
   


        setLoading(true);
        try{
            const asset_type = currentAlgorithm.tags?.[0];
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const buyAlg_transaction = await json.marketplace.buyNft(json.nft.address,marketplace_id,{value: ethers.utils.parseEther(price), nonce:transaction_count});
            await buyAlg_transaction.wait();
            const content_cid = await json.nft.tokenURI(currentAlgorithm.id)
            const data ={
                cid: content_cid,
                asset_name: currentAlgorithm.title

            }
            // if(asset_type == 'DT'){        
            //     const response = await axios.post(`http://${master_ip}:31007/set_data_marketplace`, data, {
            //         headers: {
            //             'Content-Type': 'application/json'
            //         }
            //     });
            // }else{

            //     const response = await axios.post(`http://${master_ip}:31007/set_project_marketplace`, data, {
            //         headers: {
            //             'Content-Type': 'application/json'
            //         }
            //     });        

            // }



            setShowPurchaseComplete(true);
        } catch(error){
            console.error("Metamask error",error);
            setShowPurchaseFailed(true);
        }
        setLoading(false);
    }

    const algorithm_tags = currentAlgorithm.tags?.map((tag,index)=>(
        <Pill bg="lightblue" key={index}>{tag}</Pill>
    ))

    const truncate_middle = (str:string) => {
        if (str.length > 35) {
          return str.substring(0, 6) + '...' + str.substring(str.length-4, str.length);
        }
        return str;
      }
console.log(currentAlgorithm.desc)

    const downloadAsset = async () => {
        try{
            const asset_content_hash = await json.nft.tokenURI(currentAlgorithm.id);
            console.log(asset_content_hash);

            const response = await ipfs_download(asset_content_hash);

            const url = window.URL.createObjectURL(new Blob([response.data]));

            const link = document.createElement('a');
            link.href = url;

            link.setAttribute('download',currentAlgorithm.title);
            document.body.appendChild(link);
            link.click();

            // Cleanup: Remove the link after downloading
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error){
            console.error(error);
        }
    }

    
    return (
        <>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "lg", blur: 7 }} pos="fixed" loaderProps={{
        children:<Stack align='center'>
                  <Loader color='blue'/>
                  <h3>Just a moment...</h3>
                  <Text>Your transaction is being processed on the blockchain.</Text>
              </Stack>
          }}/>

        <Modal 
        opened={showPurchaseComplete}
        onClose={()=>{algHandlers.increment(); setShowPurchaseComplete(false); changePage(0);}}
        centered={true}
        size="sm"
        >
            <Stack align="center" gap="xl" my={30}>
                <Image src="./images/checkmark.png" h={64} w={64}></Image>
                <Text fw={500} ta="center" mt={10}>Your purchase was completed successfully.</Text>
            </Stack>
        </Modal>

        <Modal 
        opened={showPurchaseFailed}
        onClose={()=>{setShowPurchaseFailed(false);}}
        centered={true}
        size="sm"
        >
            <Stack align="center" gap="xl" my={30}>
                <Image src="./images/cross.png" h={64} w={64}></Image>
                <Text fw={500} ta="center" mt={10}>An error occured during your purchase.</Text>
            </Stack>
        </Modal>


        <Container maw="95%" w="95%">
        <Flex justify="start" mt={30}>
            {isPurchased ? 
                <UnstyledButton onClick={()=>changePage(0)}><Text c="#0000FF"><u>⬅ Back to the Home page</u></Text></UnstyledButton>    
                :
                <UnstyledButton onClick={()=>changePage(0)}><Text c="#0000FF"><u>⬅ Back to the Marketplace</u></Text></UnstyledButton>
            }
        </Flex>

        
        <h2>{currentAlgorithm.title}</h2>
        <Group gap="xs">
            <Image src="./images/oasees-logo2.png" w={16} h={16}/>
            <Text fz={14}>OASEES Network</Text>
        </Group>

        <Grid gutter="xs" mt={20}>
            <Grid.Col ta="left" span={8}>
                <Container className={`${styles.container}`} pt={20}>
                        <Markdown 
                        disallowedElements={[]}
                        unwrapDisallowed
                        children={currentAlgorithm.desc}
                        components={{img:({node,...props})=><img style={{maxWidth:'100%'}}{...props}/>}}
                        remarkPlugins={[remarkGfm,remarkMath]}
                        rehypePlugins={[rehypeKatex]}/>
                </Container>
            </Grid.Col>

            <Grid.Col span={4}>
                <Container className={styles.container}>
                    <Card padding='lg' ta="left">
                            <Center><u><h3>Marketplace Info</h3></u></Center>
                            <Stack gap="lg" my={20}>
                                <Group><Text fw={600}>Seller:</Text><Text>{truncate_middle(currentAlgorithm.seller!)}</Text></Group>
                                <Group><Text fw={600}>Price:</Text><Text>{currentAlgorithm.price} eth</Text></Group>
                                <Group gap="xs"><Text fw={600}>Tags:</Text>{algorithm_tags}</Group>
                            </Stack>
                            {isPurchased ?
                                <Center mt={20}><Button color="green" onClick={downloadAsset}>DOWNLOAD</Button></Center>
                                :
                                <Center mt={20}><Button color="orange" onClick={()=>purchase_algorithm(currentAlgorithm.marketplace_id,(currentAlgorithm.price as string))}>PURCHASE</Button></Center>
                            }
                    </Card>
                </Container>
            </Grid.Col>
        </Grid>
        </Container>
            </>
    );
}

export default AlgorithmPage;