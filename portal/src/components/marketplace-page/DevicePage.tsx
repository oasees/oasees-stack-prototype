import { Card, Center, Image, Button, Stack, LoadingOverlay, Loader, Text, Flex, Grid, Container, Group, Modal, UnstyledButton} from "@mantine/core";
import { useState } from "react";
import axios from "axios";
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import styles from './ItemPage.module.css'
import { ethers } from "ethers";
import { NftItem } from "src/types/interfaces";

interface AlgorithmPageProps{
    json:any;
    changePage:(n:number)=>void;
    currentDevice: NftItem;
    devHandlers:any;
}


const ipfs_get = async (ipfs_hash:string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_IPFS_HOST}/api/v0/cat?arg=` + ipfs_hash);
    return response; 
  }


const DevicePage = ({json,changePage,currentDevice,devHandlers}:AlgorithmPageProps ) => {

    const [loading,setLoading] = useState(false);
    const [showPurchaseComplete, setShowPurchaseComplete] = useState(false);
    const [showPurchaseFailed, setShowPurchaseFailed] = useState(false);

 
    const purchase_device = async (marketplace_id:string, price:string) => {
        setLoading(true);

        try{
            
   
            


            const transaction_count = await json.provider.getTransactionCount(json.account);
            const buyDevice_transaction = await json.marketplace.buyDevice(json.nft.address,marketplace_id,{value: ethers.utils.parseEther(price), nonce:transaction_count});
            await buyDevice_transaction.wait();

            // const myDevices = await json.marketplace.getMyDevices({from: json.account});
            // const lastBoughtDevice = myDevices[myDevices.length-1];

            // if (lastBoughtDevice[8]){
            const config_hash = await json.nft.tokenURI(currentDevice.id);
            
            try{
                const res = await axios.post(`http://${json.main_cluster_ip}:31007/new_cluster`,{
                    "config_hash": config_hash,
                });
                console.log(res);
            } catch (error){
                console.error('Error:', error);
                }
            // }

            setShowPurchaseComplete(true);
        } catch(error){
            console.error("Metamask error",error);
            setShowPurchaseFailed(true);
        }
        setLoading(false);
    }

    // const algorithm_tags = currentDevice.tags?.map((tag,index)=>(
    //     <Pill bg="lightblue" key={index}>{tag}</Pill>
    // ))

    const truncate_middle = (str:string) => {
        if (str.length > 35) {
          return str.substring(0, 6) + '...' + str.substring(str.length-4, str.length);
        }
        return str;
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
        onClose={()=>{devHandlers.increment(); setShowPurchaseComplete(false); changePage(0);}}
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
            <UnstyledButton onClick={()=>changePage(0)}><Text c="#0000FF"><u>⬅ Back to the Marketplace</u></Text></UnstyledButton>
        </Flex>

        
        <h2>{currentDevice.title}</h2>
        <Group gap="xs">
            <Image src="./images/oasees-logo2.png" w={16} h={16}/>
            <Text fz={14}>OASEES Network</Text>
        </Group>

        <Grid gutter="xs" mt={20}>
            <Grid.Col ta="left" span={8}>
                <Container className={styles.container}>
                <Markdown components={{img:({node,...props})=><img style={{maxWidth:'100%'}}{...props}/>}} remarkPlugins={[remarkGfm]} >{currentDevice.desc}</Markdown>
                </Container>
            </Grid.Col>

            <Grid.Col span={4}>
                <Container className={styles.container}>
                    <Card padding='lg' ta="left">
                            <Center><u><h3>Marketplace Info</h3></u></Center>
                            <Stack gap="lg" my={20}>
                                <Group><Text fw={600}>Seller:</Text><Text>{truncate_middle(currentDevice.seller!)}</Text></Group>
                                <Group><Text fw={600}>Price:</Text><Text>{currentDevice.price} eth</Text></Group>
                                {/* <Group gap="xs"><Text fw={600}>Tags:</Text>{algorithm_tags}</Group> */}
                            </Stack>
                            <Center mt={20}><Button color="orange" onClick={()=>purchase_device(currentDevice.marketplace_id,(currentDevice.price as string))}>PURCHASE</Button></Center>
                    </Card>
                </Container>
            </Grid.Col>
        </Grid>
        </Container>
            </>
    );
}

export default DevicePage;