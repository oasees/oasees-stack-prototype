import { Card, Center, SimpleGrid, Tabs, Image, Button, Stack, LoadingOverlay, Loader, Text} from "@mantine/core";
import styles from './Marketplace.module.css'
import { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { useCounter } from "@mantine/hooks";


interface MarketplaceProps{
    json:any;
}

interface CardProps{
    desc: string;
    id: string;
    marketplace_id: string;
    price?: string;
    title: string;
}


const ipfs_get = async (ipfs_hash:string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_IPFS_HOST}/api/v0/cat?arg=` + ipfs_hash);
    return response; 
  }


const Marketplace = ({json}:MarketplaceProps) => {

    const [algorithms,setAlgorithms] = useState<CardProps[]>([]);
    const [daos,setDaos] = useState<CardProps[]>([]);
    const [devices,setDevices] = useState<CardProps[]>([]);

    const [loading, setLoading] = useState(false);
    const [algCounter,algHandlers] = useCounter();
    const [daoCounter,daoHandlers] = useCounter();
    const [devCounter,devHandlers] = useCounter();
    const marketplaceMonitor: ethers.Contract = json.marketplace.connect(json.callProvider);

    useEffect(() => {
        const populateAlgorithms = async () => {
            try{
                const nft_items = [];
                const available_nfts = await marketplaceMonitor.getListedNfts();

                for (const item of available_nfts) {
                    const id = item[1];
                    const marketplace_id = item[7];
                    const price = ethers.utils.formatEther(item[4]);
                    const meta_hash = item[5];
                    
                    const content = JSON.parse((await ipfs_get(meta_hash)).data);

                    nft_items.push({
                        desc: content.description,
                        id: id,
                        marketplace_id: marketplace_id,
                        price: price,
                        title: content.title
                    })
                }

                setAlgorithms(nft_items);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }
        
        populateAlgorithms();
        
    },[algCounter]);

    useEffect(()=>{
        const populateDaos = async() => {
            try{
                const daos = [];
                const available_daos = await marketplaceMonitor.getlistedDaos({from:json.account});
                
                for (const item of available_daos) {
                    const marketplace_id = item[4];
                    var id;
                    var meta_content;

                    
                        id = item[1];
                        const meta_hash = item[2];
                        meta_content = (await ipfs_get(meta_hash)).data;
                    // }else{
                    //     id = item[5];
                    //     meta_content = {"dao_name": "Cluster", "dao_desc": "Oasees SDK."};
                    // }

                    daos.push({
                        title: meta_content.dao_name,
                        id: id,
                        marketplace_id: marketplace_id,
                        desc: meta_content.dao_desc
                    })
                
                }

                setDaos(daos);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }
        
        populateDaos();
    },[daoCounter]);


    useEffect(()=>{
        const populateDevices = async() => {
            try{
                const devices = [];
                const available_devices = await marketplaceMonitor.getListedDevices();

                for (const item of available_devices){
                    const id = item[1];
                    const marketplace_id = item[7];
                    const meta_hash = item[5];
                    const price = ethers.utils.formatEther(item[4]);

                    const content = JSON.parse((await ipfs_get(meta_hash)).data);

                    devices.push({
                        desc: content.description,
                        id: id,
                        marketplace_id: marketplace_id,
                        price: price,
                        title: content.title
                    })
                }
                setDevices(devices);

            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        populateDevices();
    },[devCounter]);




    const card_algorithms = algorithms.map((item,index) => (
        <Card shadow="sm" key={index} h={300} className={styles.card}>
            <Card.Section className={styles.imgBx}>
                <Center>
                <Image
                src="./images/catalogue.png"
                mah={150} w="auto"
                p={10}
                />
                </Center>
            </Card.Section>
            <div className={styles.contentBx}>
                <h3>{item.title}</h3>
                <h5>{item.price}</h5>
                <br/><br/>
                <Button color='orange' onClick={() => purchase_algorithm(item.marketplace_id,(item.price as string))}>PURCHASE NOW</Button>
            </div>
        </Card>
    ))

    const card_daos = daos.map((item,index) => (
        <Card shadow="sm" key={index} h={300} className={styles.card}>
            <Card.Section className={styles.imgBx}>
                <Image
                src="./images/dao_icon.png"
                mah={150} w="auto"
                p={10}
                />
            </Card.Section>
            <div className={styles.contentBx}>
                <h3>{item.title}</h3>
                <h4>{item.desc}</h4>
                <br/><br/>
                <Button color='var(--mantine-color-orange-6)' onClick={()=>join_dao(item.id,item.marketplace_id)}>JOIN</Button>
            </div>
        </Card>
    ))

    const card_devices = devices.map((item,index) => (
        <Card shadow="sm" key={index} h={300} className={styles.card}>
            <Card.Section className={styles.imgBx}>
                <Center>
                <Image
                src="./images/device_icon.png"
                mah={150} w="auto"
                p={10}
                />
                </Center>
            </Card.Section>
            <div className={styles.contentBx}>
                <h3>{item.title}</h3>
                <h4>{item.desc}</h4>
                <h5>{item.price}</h5>
                <Button color='orange' onClick={()=>purchase_device(item.marketplace_id,(item.price as string))}>BUY</Button>
            </div>
        </Card>
    ))





    const purchase_algorithm = async (marketplace_id:string, price:string) => {
        setLoading(true);
        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const buyAlg_transaction = await json.marketplace.buyNft(json.nft.address,marketplace_id,{value: ethers.utils.parseEther(price), nonce:transaction_count});
            await buyAlg_transaction.wait();
        } catch(error){
            console.error("Metamask error",error);
        }
        algHandlers.increment();
        setLoading(false);
    }

    

    const join_dao = async (id:string, marketplace_id:string) => {
        setLoading(true);
        try{
            const dao_content_hash = await json.nft.tokenURI(id);
            const content = (await ipfs_get(dao_content_hash)).data;
            const signer = await json.provider.getSigner();

            const dao_token_provider_contract = new ethers.Contract(
                content.token_provider_address, 
                content.token_provider_abi,
                await signer)
            

            const vote_token_contract = new ethers.Contract(
                content.token_address,
                content.token_abi,
                await signer)

            const transaction_count = await json.provider.getTransactionCount(json.account);

            const get_tokens_transaction = await dao_token_provider_contract.getTokens({nonce:transaction_count});
            const delegate_transaction = await vote_token_contract.delegate(json.account,{nonce:transaction_count+1});
            const join_transaction = await json.marketplace.joinDao(marketplace_id,{nonce:transaction_count+2});

            await Promise.all([get_tokens_transaction.wait(),join_transaction.wait(),delegate_transaction.wait()]);
        } catch(error){
            console.error("Metamask error",error);
        }
        daoHandlers.increment();
        setLoading(false);
    }

    const purchase_device = async (marketplace_id:string, price:string) => {
        setLoading(true);
        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const buyDevice_transaction = await json.marketplace.buyDevice(json.nft.address,marketplace_id,{value: ethers.utils.parseEther(price), nonce:transaction_count});
            await buyDevice_transaction.wait();
        } catch(error){
            console.error("Metamask error",error);
        }
        devHandlers.increment();
        setLoading(false);
    }

    useEffect(() => {
        const checkEvent = async () => {
            marketplaceMonitor.on("NFTListed",algHandlers.increment);
            marketplaceMonitor.on("NewDAO",daoHandlers.increment);
            marketplaceMonitor.on("DeviceListed",devHandlers.increment);
        }

        checkEvent();
        return () => {marketplaceMonitor.off("NFTListed",algHandlers.increment); marketplaceMonitor.off("NewDAO",daoHandlers.increment); marketplaceMonitor.off("DeviceListed",devHandlers.increment);}
    },[])

    return (
        <>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "lg", blur: 7 }} pos="fixed" loaderProps={{
        children:<Stack align='center'>
                  <Loader color='blue'/>
                  <h3>Just a moment...</h3>
                  <Text>Your transaction is being processed on the blockchain.</Text>
              </Stack>
          }}/>

        <Tabs defaultValue="algorithms" pt={30}>
                <Tabs.List grow>
                    <Tabs.Tab className={styles.marketplace_tab} value="algorithms">
                        Algorithms
                    </Tabs.Tab>

                    <Tabs.Tab className={styles.marketplace_tab} value="daos">
                        DAOs
                    </Tabs.Tab>

                    <Tabs.Tab className={styles.marketplace_tab} value="devices">
                        Devices
                    </Tabs.Tab>
                </Tabs.List>


                <Tabs.Panel value="algorithms" pt={20}>
                    <SimpleGrid cols={{base:1, sm:2, md:3, lg:4}}>
                        {card_algorithms}
                    </SimpleGrid>
                </Tabs.Panel>

                <Tabs.Panel value="daos" pt={20}>
                    <SimpleGrid cols={{base:1, sm:2, md:3, lg:4}}>
                        {card_daos}
                    </SimpleGrid>
                    {/* <div className={classNames(styles.root)}>
                        <div className={styles.subdiv}>
                            {card_daos}
                        </div>
                    </div> */}
                </Tabs.Panel>

                <Tabs.Panel value="devices" pt={20}>
                    <SimpleGrid cols={{base:1, sm:2, md:3, lg:4}}>
                        {card_devices}
                    </SimpleGrid>
                </Tabs.Panel>
                
            </Tabs>
            </>
    );
}

export default Marketplace