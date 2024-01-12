import { Card, Center, SimpleGrid, Tabs, Image, Button, Stack, LoadingOverlay, Loader} from "@mantine/core";
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

    const [visible,setVisible] = useState(false);
    const [refresh,{toggle}] = useDisclosure();

    useEffect(() => {
        const populateAlgorithms = async () => {
            try{
                const nft_items = [];
                const available_nfts = await json.marketplace.getListedNfts();

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
        
    },[refresh]);

    useEffect(()=>{
        const populateDaos = async() => {
            try{
                const daos = [];
                const available_daos = await json.marketplace.getlistedDaos();
                
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
    },[refresh]);


    useEffect(()=>{
        const populateDevices = async() => {
            try{
                const devices = [];
                const available_devices = await json.marketplace.getListedDevices();

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
    },[refresh]);




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
        setVisible(true);
        try{
            const buyAlg_transaction = await json.marketplace.buyNft(json.nft.target,marketplace_id,{value: ethers.parseEther(price)});
            await buyAlg_transaction.wait();
        } catch(error){
            console.error("Metamask error",error);
        }
        toggle();
        setVisible(false);
    }

    

    const join_dao = async (id:string, marketplace_id:string) => {
        setVisible(true);
        try{
            const dao_content_hash = await json.nft.tokenURI(id);
            const content = await IpfsGet(dao_content_hash);
            const signer = await json.provider.getSigner();

            const dao_token_provider_contract = new ethers.Contract(
                content.token_provider_address, 
                content.token_provider_abi,
                await signer)

            const get_tokens_transaction = await dao_token_provider_contract.getTokens();
            await get_tokens_transaction.wait();

            const join_transaction = await json.marketplace.joinDao(marketplace_id);
            await join_transaction.wait();
        } catch(error){
            console.error("Metamask error",error);
        }
        toggle();
        setVisible(false);
    }

    const purchase_device = async (marketplace_id:string, price:string) => {
        setVisible(true);
        try{
            const buyDev_transaction = await json.marketplace.buyDevice(json.nft.target,marketplace_id,{value: ethers.parseEther(price)});
            await buyDev_transaction.wait();
        } catch(error){
            console.error("Metamask error",error);
        }
        toggle();
        setVisible(false);
    }

    

    return (
        <>
        <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "lg", blur: 2 }} loaderProps={{children:<Stack align='center'><Loader color='blue'/></Stack>}} />
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