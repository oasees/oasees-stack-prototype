import { Card, Center, SimpleGrid, Tabs, Image, Button, Stack, LoadingOverlay, Loader, Text} from "@mantine/core";
import './Marketplace.css'
import { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { useDisclosure } from "@mantine/hooks";


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


const Marketplace = ({json}:MarketplaceProps) => {

    const [algorithms,setAlgorithms] = useState<CardProps[]>([]);
    const [daos,setDaos] = useState<CardProps[]>([]);
    const [devices,setDevices] = useState<CardProps[]>([]);

    const [loading, setLoading] = useState(false);
    const [refresh,{toggle}] = useDisclosure();
    const marketplaceMonitor = json.marketplace.connect(json.callProvider);

    useEffect(() => {
        const populateAlgorithms = async () => {
            try{
                const nft_items = [];
                const available_nfts = await marketplaceMonitor.getListedNfts();

                for (const item of available_nfts) {
                    const id = item[1];
                    const marketplace_id = item[7];
                    const price = ethers.formatEther(item[4]);
                    const meta_hash = item[5];
                    
                    const content = JSON.parse(await IpfsGet(meta_hash));

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
        
    },[refresh,json.marketplace]);

    useEffect(()=>{
        const populateDaos = async() => {
            try{
                const daos = [];
                const available_daos = await marketplaceMonitor.getlistedDaos({from:json.account});
                
                for (const item of available_daos) {
                    const id = item[1];
                    const marketplace_id = item[4];
                    const meta_hash = item[2];
                    const meta_content = await IpfsGet(meta_hash);

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
    },[refresh, json.marketplace]);


    useEffect(()=>{
        const populateDevices = async() => {
            try{
                const devices = [];
                const available_devices = await marketplaceMonitor.getListedDevices();

                for (const item of available_devices){
                    const id = item[1];
                    const marketplace_id = item[7];
                    const meta_hash = item[5];
                    const price = ethers.formatEther(item[4]);

                    const content = JSON.parse(await IpfsGet(meta_hash));

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
    },[refresh, json.marketplace]);




    const card_algorithms = algorithms.map((item,index) => (
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{textAlign:"center"}} key={index}>
            <Card.Section>
                <Center>
                <Image
                src="./images/catalogue.png"
                mah={200} maw={200}
                p={10}
                />
                </Center>
            </Card.Section>
            <Stack align='center'>
                <h2>{item.title}</h2>
                <h4>{item.price}</h4>
                <Button color='orange' onClick={() => purchase_algorithm(item.marketplace_id,(item.price as string))}>PURCHASE NOW</Button>
            </Stack>
        </Card>
    ))

    const card_daos = daos.map((item,index) => (
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{textAlign:"center"}} key={index}>
            <Card.Section>
                <Center>
                <Image
                src="./images/dao_icon.png"
                mah={200} maw={200}
                p={10}
                />
                </Center>
            </Card.Section>
            <Stack align='center'>
                <h2>{item.title}</h2>
                <h4>{item.desc}</h4>
                <Button color='orange' onClick={()=>join_dao(item.id,item.marketplace_id)}>JOIN</Button>
            </Stack>
        </Card>
    ))

    const card_devices = devices.map((item,index) => (
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{textAlign:"center"}} key={index}>
            <Card.Section>
                <Center>
                <Image
                src="./images/dao_icon.png"
                mah={200} maw={200}
                p={10}
                />
                </Center>
            </Card.Section>
            <Stack align='center'>
                <h2>{item.title}</h2>
                <h3>{item.desc}</h3>
                <h4>{item.price}</h4>
                <Button color='orange' onClick={()=>purchase_device(item.marketplace_id,(item.price as string))}>BUY</Button>
            </Stack>
        </Card>
    ))





    const purchase_algorithm = async (marketplace_id:string, price:string) => {
        setLoading(true);
        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const buyAlg_transaction = await json.marketplace.buyNft(json.nft.target,marketplace_id,{value: ethers.parseEther(price), nonce:transaction_count});
            await buyAlg_transaction.wait();
        } catch(error){
            console.error("Metamask error",error);
        }
        toggle();
        setLoading(false);
    }

    

    const join_dao = async (id:string, marketplace_id:string) => {
        setLoading(true);
        try{
            const dao_content_hash = await json.nft.tokenURI(id);
            const content = await IpfsGet(dao_content_hash);
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
            const join_transaction = await json.marketplace.joinDao(marketplace_id,{nonce:transaction_count+1});
            const delegate_transaction = await vote_token_contract.delegate(json.account,{nonce:transaction_count+2});

            await Promise.all([get_tokens_transaction.wait(),join_transaction.wait(),delegate_transaction.wait()]);
        } catch(error){
            console.error("Metamask error",error);
        }
        toggle();
        setLoading(false);
    }

    const purchase_device = async (marketplace_id:string, price:string) => {
        setLoading(true);
        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const buyDevice_transaction = await json.marketplace.buyDevice(json.nft.target,marketplace_id,{value: ethers.parseEther(price), nonce:transaction_count});
            await buyDevice_transaction.wait();
        } catch(error){
            console.error("Metamask error",error);
        }
        toggle();
        setLoading(false);
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

        <Tabs defaultValue="algorithms" pt={30}>
                <Tabs.List grow>
                    <Tabs.Tab className='marketplace-tab' value="algorithms">
                        Algorithms
                    </Tabs.Tab>

                    <Tabs.Tab className='marketplace-tab' value="daos">
                        DAOs
                    </Tabs.Tab>

                    <Tabs.Tab className='marketplace-tab' value="devices">
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