import { Card, Center, SimpleGrid, Tabs, Image, Stack, LoadingOverlay, Loader, Text, Flex, Group, CardSection } from "@mantine/core";
import styles from './Marketplace.module.css'
import "./ItemPage.css"
import { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { useCounter } from "@mantine/hooks";
import Markdown from "react-markdown";
import AlgorithmPage from "./AlgorithmPage";
import DatasetPage from "./DatasetPage";
import DAOPage from "./DAOPage";
import DevicePage from "./DevicePage";
import { NftItem } from "src/types/interfaces";
import OSModelPage from "./OSModelPage";

interface MarketplaceProps {
    json: any;
}

interface OSResult {
    "info": any;
    "algorithm": string;
    "dimension": number;
    "id": string;
    "name": string;
    "state": string;
    "version": string;
}


const os_backend_api = `http://${process.env.REACT_APP_EXPOSED_IP}:32400/results`;


const fetchModels = async () => {
    try {
        const response = await fetch(os_backend_api, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
};


const ipfs_get = async (ipfs_hash: string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_EXPOSED_IP}:5001/api/v0/cat?arg=` + ipfs_hash);
    return response;
}


const Marketplace = ({ json }: MarketplaceProps) => {
    const [algorithms, setAlgorithms] = useState<NftItem[]>([]);
    const [datasets, setDatasets] = useState<NftItem[]>([]);
    const [osList, setOSList] = useState<OSResult[]>([]);
    const [daos, setDaos] = useState<any[]>([]);
    const [devices, setDevices] = useState<NftItem[]>([]);

    const [currentAlgorithm, setCurrentAlgorithm] = useState(0);
    const [currentDataset, setCurrentDataset] = useState(0);
    const [currentDAO, setCurrentDAO] = useState(0);
    const [currentDevice, setCurrentDevice] = useState(0);
    const [currentOS, setCurrentOS] = useState(0);

    const [currentTab, setCurrentTab] = useState('assets');

    const [loading, setLoading] = useState(false);
    const [algCounter, algHandlers] = useCounter();
    const [daoCounter, daoHandlers] = useCounter();
    const [devCounter, devHandlers] = useCounter();
    const marketplaceMonitor: ethers.Contract = json.marketplace.connect(json.callProvider);

    const [activePage, setActivePage] = useState(0);

    const removeMd = require('remove-markdown');

    useEffect(() => {
        const populateItems = async () => {
            try {
                const algorithms = [];
                const datasets = [];
                const available_nfts = await marketplaceMonitor.getListedNfts();

                for (const item of available_nfts) {

                    const id = item[1];
                    const marketplace_id = item[7];
                    const price = ethers.utils.formatEther(item[4]);
                    const meta_hash = item[5];

                    const content = JSON.parse((await ipfs_get(meta_hash)).data);
                    var asset_type = content.tags[0];
                    console.log(asset_type)
                    if (asset_type == 'DT') {
                        asset_type = 'DATASET'
                    } else {
                        asset_type = 'ALGORITHM'
                    }

                    if (asset_type == 'ALGORITHM') {
                        algorithms.push({
                            desc: content.description,
                            id: id,
                            marketplace_id: marketplace_id,
                            price: price,
                            title: content.title,
                            tags: content.tags,
                            asset_type: asset_type,
                            seller: item[2],
                        })
                    } else {
                        datasets.push({
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
                }

                setAlgorithms(algorithms);
                setDatasets(datasets);
            } catch (error) {
                console.error('Error loading contracts: ', error);
            }
        }

        populateItems();

    }, [algCounter]);

    useEffect(() => {
        const populateOSList = async () => {
            try {
                const osList = [];
                const available_os_models = await fetchModels();

                for (const res of available_os_models.results) {
                    osList.push({
                        info: res.all_info,
                        algorithm: res.algorithm,
                        dimension: res.dimension,
                        id: res.id,
                        name: res.name,
                        state: res.state,
                        version: res.version,
                    })
                }
                setOSList(osList);
            } catch (error) {
                console.error('Error loading contracts: ', error);
            }
        }
        populateOSList();
    }, []);

    useEffect(() => {
        const populateDaos = async () => {
            try {
                const daos = [];
                const available_daos = await marketplaceMonitor.getlistedDaos();

                console.log(available_daos);

                for (const item of available_daos.slice(21)) {
                    const marketplace_id = item[0];

                    var members = await marketplaceMonitor.getDaoMembers(marketplace_id);

                    daos.push({
                        title: item[5],
                        governance: item.governance,
                        id: marketplace_id,
                        desc: `**Decentralized Autonomous Organization** A community-led entity governed by transparent rules encoded as smart contracts on the blockchain. Members vote on proposals and manage shared resources collectively.`,
                        members: members
                    })

                }

                setDaos(daos);
            } catch (error) {
                console.error('Error loading contracts: ', error);
            }
        }

        populateDaos();
    }, [daoCounter]);


    useEffect(() => {
        const populateDevices = async () => {
            try {
                const devices = [];
                const available_devices = await marketplaceMonitor.getListedDevices();


                for (const item of available_devices) {
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

            } catch (error) {
                console.error('Error loading contracts: ', error);
            }
        }

        populateDevices();
    }, [devCounter]);


    const truncate_middle = (str: string) => {
        if (str.length > 35) {
            return str.substring(0, 6) + '...' + str.substring(str.length - 4, str.length);
        }
        return str;
    }


    const openAlgorithmPage = (index: number) => {
        setCurrentAlgorithm(index);
        setCurrentTab('assets');
        changePage(1);
    }

    const openDAOPage = (index: number) => {
        setCurrentDAO(index);
        setCurrentTab('daos');
        changePage(2);
    }

    // const openDevicePage = (index:number) => {
    //     setCurrentDevice(index);
    //     setCurrentTab('devices');
    //     changePage(3);
    // }

    const openDatasetPage = (index: number) => {
        setCurrentDataset(index);
        setCurrentTab('assets');
        changePage(4);
    }

    const openOSPage = (index: number) => {
        setCurrentOS(index);
        setCurrentTab('assets');
        changePage(5);
    }

    const changePage = (n: number) => {
        setActivePage(n);
    }

    const renderAssetCard = (item: NftItem, index: number, type: string, onClick: () => void) => (
        <Card key={index} radius={0} withBorder className="newCard" padding={30} py={25} onClick={onClick}>
            <Group gap={8} align="center">
                <Image src="./images/asset.png" w={15} h={15} />
                <Text fz={10} mt={0}>ASSET | {type}</Text>
            </Group>
            <Text fw={600} mt={13} c="#00304e" truncate="end">{item.title.replaceAll('_', ' ').replace('.py', '')}</Text>
            <Text fz={13} mt={5}>{truncate_middle(item.seller!)}</Text>
            <Flex w="100%" h={110} p={0} direction="column" justify="space-between" mt={15}>
                <Markdown className="markdown_desc" disallowedElements={['hr', 'strong', 'ul', 'h1', 'h2']}>
                    {item.desc}
                </Markdown>
                {/* {removeMd(item.desc)} */}
                <Group className="cardFooter" justify="space-between" mt={10}>
                    <Text fz={13}><Text fw={600} inherit span>{item.price}</Text> ETH</Text>
                    <Group gap={8}>
                        <Image src="./images/oasees-logo2.png" w={16} h={16} />
                        <Text fz={10}>OASEES Network</Text>
                    </Group>
                </Group>
            </Flex>
        </Card>
    );

    const card_algorithms = algorithms.map((item, index) => renderAssetCard(item, index, 'ALGORITHM', () => openAlgorithmPage(index)));

    const card_datasets = datasets.map((item, index) => renderAssetCard(item, index, 'DATASET', () => openDatasetPage(index)));

    const card_os_models = osList.map((item, index) => (
        <Card key={index} radius={0} withBorder className="newCard" padding={30} py={25} onClick={() => openOSPage(index)}>
            <Group gap={8} align="center">
                <Image src="./images/asset.png" w={15} h={15} />
                <Text fz={10} mt={0}>ASSET | Model</Text>
            </Group>
            <Text fw={600} mt={13} c="#00304e" truncate="end">{item.name}</Text>
            {/* <Text fz={13} mt={5}>{truncate_middle(item.seller!)}</Text> */}
            <Flex w="100%" h={110} p={0} direction="column" justify="space-between" mt={15}>
                <Stack gap={5}>
                    <Text fz={13}><Text fw={600} inherit span>ID:</Text> {item.id}</Text>
                    <Text fz={13}><Text fw={600} inherit span>Algorithm type:</Text> {item.algorithm}</Text>
                    <Text fz={13}><Text fw={600} inherit span>Model type:</Text> {item.dimension}</Text>
                    <Text fz={13}><Text fw={600} inherit span>Version:</Text> {item.version}</Text>
                </Stack>

                <Group className="cardFooter" justify="space-between" mt={20}>
                    <Text fz={13}><Text fw={600} inherit span c="green">{item.state}</Text></Text>
                    <Group gap={8}>
                        <Image src="./images/opensearch_logo.png" w={20} h={20} />
                        <Text fz={12}>OpenSearch Database</Text>
                    </Group>
                </Group>
            </Flex>
        </Card>
    ));

    const card_daos = daos.map((dao, index) => (
        <Center key={index}>
            <Card withBorder className="DAOCard" key={index} h={280} w={{ base: 180, sm: 300 }} onClick={() => openDAOPage(index)}>
                <CardSection >
                    <Center>
                        <Image src="./images/dao_icon.png" w="auto" mah={140} alt="DAO icon" />
                    </Center>
                </CardSection>
                <Flex align="center" direction="column" justify="space-between" w="100%" h="100%">
                    <Text fw={600} c="#00304e">{dao.title}</Text>
                    <Markdown disallowedElements={['hr', 'strong', 'ul', 'h1', 'h2']} className="markdown_desc_dao">
                        {dao.desc}
                    </Markdown>
                    {/* {removeMd(dao.desc)} */}
                    <Text>Members : <b>{dao.members?.length}</b></Text>
                </Flex>
            </Card>
        </Center>
    ))

    // const card_devices = devices.map((item,index) => (
    //     <Card key={index} radius={0} withBorder className="newCard" padding={30} py={25} onClick={()=> openDevicePage(index)}>
    //         <Group gap={8} align="center">
    //             <Image src="./images/asset.png" w={15} h={15}/>
    //             <Text fz={10} mt={0}>EDGE DEVICE</Text>
    //         </Group>
    //         <Text fw={600} mt={13} c="#00304e" truncate="end">{item.title}</Text>
    //         <Text fz={13} mt={5}>{truncate_middle(item.seller!)}</Text>
    //         <Flex w="100%" h={110} p={0} direction="column" justify="space-between" mt={15}>                
    //                 <Markdown className="markdown_desc" disallowedElements={['hr', 'strong','ul','h1','h2']}>
    //                     {item.desc}
    //                 </Markdown>
    //                 {/* {removeMd(item.desc)} */}
    //             <Group className="cardFooter" justify="space-between" mt={10}>
    //                 <Text fz={13}><Text fw={600} inherit span>{item.price}</Text> ETH</Text>
    //                 <Group gap={8}>
    //                     <Image src="./images/oasees-logo2.png" w={16} h={16}/>
    //                     <Text fz={10}>OASEES Network</Text>
    //                 </Group>
    //             </Group>
    //         </Flex>
    //     </Card>
    // ))



    useEffect(() => {
        const checkEvent = async () => {
            marketplaceMonitor.on("NFTListed", algHandlers.increment);
            marketplaceMonitor.on("NewDAO", daoHandlers.increment);
            marketplaceMonitor.on("DeviceListed", devHandlers.increment);
        }

        checkEvent();
        return () => { marketplaceMonitor.off("NFTListed", algHandlers.increment); marketplaceMonitor.off("NewDAO", daoHandlers.increment); marketplaceMonitor.off("DeviceListed", devHandlers.increment); }
    }, [])


    return (
        <>
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "lg", blur: 7 }} pos="fixed" loaderProps={{
                children: <Stack align='center'>
                    <Loader color='blue' />
                    <h3>Just a moment...</h3>
                    <Text>Your transaction is being processed on the blockchain.</Text>
                </Stack>
            }} />

            {activePage == 1 ?
                <AlgorithmPage json={json} changePage={changePage} currentAlgorithm={algorithms[currentAlgorithm]} algHandlers={algHandlers} isPurchased={false} />
                :
                activePage == 2 ?
                    <DAOPage json={json} changePage={changePage} currentDao={daos[currentDAO]} daoHandlers={daoHandlers} />
                    :
                    activePage == 3 ?
                        <DevicePage json={json} changePage={changePage} currentDevice={devices[currentDevice]} devHandlers={devHandlers} />
                        :
                        activePage == 4 ?
                            <DatasetPage json={json} changePage={changePage} currentDataset={datasets[currentDataset]} datasetHandlers={algHandlers} isPurchased={false} />
                            :
                            activePage == 5 ?
                                <OSModelPage json={json} changePage={changePage} currentOSModel={osList[currentOS]} />
                                :
                                <Tabs defaultValue={currentTab} pt={30}>
                                    <Tabs.List grow>
                                        <Tabs.Tab className={styles.marketplace_tab} value="assets">
                                            Assets
                                        </Tabs.Tab>

                                        <Tabs.Tab className={styles.marketplace_tab} value="daos">
                                            DAOs
                                        </Tabs.Tab>

                                        {/* <Tabs.Tab className={styles.marketplace_tab} value="devices">
                            Devices
                        </Tabs.Tab> */}
                                    </Tabs.List>


                                    <Tabs.Panel value="assets" pt={20} >
                                        <Tabs defaultValue="algorithms" variant="pills" color="orange">
                                            <Tabs.List pl={30} pt={10} >
                                                <Tabs.Tab className={styles.marketplace_sub_tab} value="algorithms">
                                                    Algorithms
                                                </Tabs.Tab>

                                                <Tabs.Tab className={styles.marketplace_sub_tab} value="datasets">
                                                    Datasets
                                                </Tabs.Tab>

                                                <Tabs.Tab className={styles.marketplace_sub_tab} value="opensearch">
                                                    OpenSearch Listings
                                                </Tabs.Tab>

                                            </Tabs.List>
                                            <Tabs.Panel value="algorithms" p={30} pt={20}>
                                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={30}>
                                                    {card_algorithms}
                                                </SimpleGrid>
                                            </Tabs.Panel>
                                            <Tabs.Panel value="datasets" p={30} pt={20}>
                                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={30}>
                                                    {card_datasets}
                                                </SimpleGrid>
                                            </Tabs.Panel>
                                            <Tabs.Panel value="opensearch" p={30} pt={20}>
                                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={30}>
                                                    {card_os_models}
                                                </SimpleGrid>
                                            </Tabs.Panel>
                                        </Tabs>
                                    </Tabs.Panel>

                                    <Tabs.Panel value="daos" p={30} pt={20}>
                                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} >
                                            {card_daos}
                                        </SimpleGrid>
                                        {/* <div className={classNames(styles.root)}>
                            <div className={styles.subdiv}>
                                {card_daos}
                            </div>
                        </div> */}
                                    </Tabs.Panel>

                                    {/* <Tabs.Panel value="devices" pt={20}>
                        <SimpleGrid cols={{base:1, sm:2, lg:3, xl:4}} spacing={30}>
                            {card_devices}
                        </SimpleGrid>
                    </Tabs.Panel> */}

                                </Tabs>
            }
        </>
    );
}

export default Marketplace