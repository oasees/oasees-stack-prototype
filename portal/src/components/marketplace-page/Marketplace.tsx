import { Card, Center, SimpleGrid, Tabs, Image, Stack, LoadingOverlay, Loader, Text, Flex, Group, CardSection} from "@mantine/core";
import styles from './Marketplace.module.css'
import "./ItemPage.css"
import { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { useCounter } from "@mantine/hooks";
import Markdown from "react-markdown";
import AlgorithmPage from "./AlgorithmPage";
import DAOPage from "./DAOPage";
import DevicePage from "./DevicePage";
import { NftItem } from "src/types/interfaces";

interface MarketplaceProps{
    json:any;
}



const ipfs_get = async (ipfs_hash:string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_IPFS_HOST}/api/v0/cat?arg=` + ipfs_hash);
    return response; 
  }


const Marketplace = ({json}:MarketplaceProps) => {
    const [algorithms,setAlgorithms] = useState<NftItem[]>([]);
    const [daos,setDaos] = useState<NftItem[]>([]);
    const [devices,setDevices] = useState<NftItem[]>([]);

    const [currentAlgorithm, setCurrentAlgorithm] = useState(0);
    const [currentDAO, setCurrentDAO] = useState(0);
    const [currentDevice,setCurrentDevice] = useState(0);

    const [currentTab,setCurrentTab] = useState('algorithms');

    const [loading, setLoading] = useState(false);
    const [algCounter,algHandlers] = useCounter();
    const [daoCounter,daoHandlers] = useCounter();
    const [devCounter,devHandlers] = useCounter();
    const marketplaceMonitor: ethers.Contract = json.marketplace.connect(json.callProvider);

    const [activePage, setActivePage] = useState(0);

    const removeMd = require('remove-markdown');

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
                    var asset_type = content.tags[0];
                    if(asset_type == 'DT')
                        asset_type = 'DATASET'
                    else
                        asset_type = 'ALGORITHM'


                    nft_items.push({
                        desc: content.description,
                        id: id,
                        marketplace_id: marketplace_id,
                        price: price,
                        title: content.title,
                        tags: content.tags,
                        asset_type: asset_type,
                        seller: item[2],
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
                        desc: meta_content.dao_desc,
                        members: await marketplaceMonitor.getDaoMembers(item[4])
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

                    

                    const content = (await ipfs_get(meta_hash)).data;

                    devices.push({
                        desc: content.description,
                        id: id,
                        marketplace_id: marketplace_id,
                        price: price,
                        title: content.title,
                        seller: item[2],
                    })
                }
                setDevices(devices);

            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        populateDevices();
    },[devCounter]);


    const truncate_middle = (str:string) => {
        if (str.length > 35) {
          return str.substring(0, 6) + '...' + str.substring(str.length-4, str.length);
        }
        return str;
      }


    const openAlgorithmPage = (index:number) => {
        setCurrentAlgorithm(index);
        setCurrentTab('algorithms');
        changePage(1);
    }

    const openDAOPage = (index:number) => {
        setCurrentDAO(index);
        setCurrentTab('daos');
        changePage(2);
    }

    const openDevicePage = (index:number) => {
        setCurrentDevice(index);
        setCurrentTab('devices');
        changePage(3);
    }

    const changePage = (n:number) => {
        setActivePage(n);
    }

    const card_algorithms = algorithms.map((item,index) => (
        

        <Card key={index} radius={0} withBorder className="newCard" padding={30} py={25} onClick={()=> openAlgorithmPage(index)}>
            <Group gap={8} align="center">
                <Image src="./images/asset.png" w={15} h={15}/>
                <Text fz={10} mt={0}>ASSET | {item.asset_type}</Text>
            </Group>
            <Text fw={600} mt={13} c="#00304e" truncate="end">{item.title.replaceAll('_', ' ').replace('.py', '')}</Text>
            <Text fz={13} mt={5}>{truncate_middle(item.seller!)}</Text>
            <Flex w="100%" h={110} p={0} direction="column" justify="space-between" mt={15}>                
                    <Markdown className="markdown_desc" disallowedElements={['hr', 'strong','ul','h1','h2']}>
                        {item.desc}
                    </Markdown>
                    {/* {removeMd(item.desc)} */}
                <Group className="cardFooter" justify="space-between" mt={10}>
                    <Text fz={13}><Text fw={600} inherit span>{item.price}</Text> ETH</Text>
                    <Group gap={8}>
                        <Image src="./images/oasees-logo2.png" w={16} h={16}/>
                        <Text fz={10}>OASEES Network</Text>
                    </Group>
                </Group>
            </Flex>
        </Card>
    ))

    const card_daos = daos.map((dao,index) => (
        <Center key={index}>
            <Card withBorder className="DAOCard" key={index} h={280} w={{base:180, sm:300}} onClick={()=>openDAOPage(index)}>
                <CardSection >
                    <Center>
                        <Image src="./images/dao_icon.png" w="auto" mah={140} alt="DAO icon"/>
                    </Center>
                </CardSection>
                <Flex align="center" direction="column" justify="space-between" w="100%" h="100%">
                    <Text fw={600} c="#00304e">{dao.title}</Text>
                    <Markdown disallowedElements={['hr', 'strong','ul','h1','h2']} className="markdown_desc_dao">
                        {dao.desc}
                    </Markdown>
                    {/* {removeMd(dao.desc)} */}
                    <Text>Members : <b>{dao.members?.length}</b></Text>
                </Flex>
            </Card>
        </Center>
    ))

    const card_devices = devices.map((item,index) => (
        <Card key={index} radius={0} withBorder className="newCard" padding={30} py={25} onClick={()=> openDevicePage(index)}>
            <Group gap={8} align="center">
                <Image src="./images/asset.png" w={15} h={15}/>
                <Text fz={10} mt={0}>EDGE DEVICE</Text>
            </Group>
            <Text fw={600} mt={13} c="#00304e" truncate="end">{item.title}</Text>
            <Text fz={13} mt={5}>{truncate_middle(item.seller!)}</Text>
            <Flex w="100%" h={110} p={0} direction="column" justify="space-between" mt={15}>                
                    <Markdown className="markdown_desc" disallowedElements={['hr', 'strong','ul','h1','h2']}>
                        {item.desc}
                    </Markdown>
                    {/* {removeMd(item.desc)} */}
                <Group className="cardFooter" justify="space-between" mt={10}>
                    <Text fz={13}><Text fw={600} inherit span>{item.price}</Text> ETH</Text>
                    <Group gap={8}>
                        <Image src="./images/oasees-logo2.png" w={16} h={16}/>
                        <Text fz={10}>OASEES Network</Text>
                    </Group>
                </Group>
            </Flex>
        </Card>
    ))


    
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

        {activePage==1 ? 
            <AlgorithmPage json={json} changePage={changePage} currentAlgorithm={algorithms[currentAlgorithm]} algHandlers={algHandlers} isPurchased={false}/>
            :
            activePage==2 ?
            <DAOPage json={json} changePage={changePage} currentDao={daos[currentDAO]} daoHandlers={daoHandlers}/>
            :
            activePage==3 ?
            <DevicePage json={json} changePage={changePage} currentDevice={devices[currentDevice]} devHandlers={devHandlers}/>
            :
            <Tabs defaultValue={currentTab} pt={30}>
                    <Tabs.List grow>
                        <Tabs.Tab className={styles.marketplace_tab} value="algorithms">
                            Assets
                        </Tabs.Tab>

                        <Tabs.Tab className={styles.marketplace_tab} value="daos">
                            DAOs
                        </Tabs.Tab>

                        <Tabs.Tab className={styles.marketplace_tab} value="devices">
                            Devices
                        </Tabs.Tab>
                    </Tabs.List>


                    <Tabs.Panel value="algorithms" pt={20}> 
                        <SimpleGrid cols={{base:1, sm:2, lg:3, xl:4}} spacing={30}>
                            {card_algorithms}
                        </SimpleGrid>
                    </Tabs.Panel>

                    <Tabs.Panel value="daos" p={30} pt={20}>
                        <SimpleGrid cols={{base:1, sm:2, md:3, lg:4, xl:5}} >
                            {card_daos}
                        </SimpleGrid>
                        {/* <div className={classNames(styles.root)}>
                            <div className={styles.subdiv}>
                                {card_daos}
                            </div>
                        </div> */}
                    </Tabs.Panel>

                    <Tabs.Panel value="devices" pt={20}>
                        <SimpleGrid cols={{base:1, sm:2, lg:3, xl:4}} spacing={30}>
                            {card_devices}
                        </SimpleGrid>
                    </Tabs.Panel>
                    
                </Tabs>
        }
                </>
    );
}

export default Marketplace