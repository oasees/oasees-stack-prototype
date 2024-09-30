import {Grid, Paper, Stack } from "@mantine/core";
import DAOModal from "../dao-modal/DAOModal";
import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useCounter, useDisclosure } from "@mantine/hooks";
import DAOCards from "../home-cards/DAOCards";
import ItemCards from "../home-cards/ItemCards";
import styles from "./Home.module.css"
import ForceGraph2D, {ForceGraphMethods,NodeObject,LinkObject} from "react-force-graph-2d";
import AlgorithmPage from "../marketplace-page/AlgorithmPage";
import { NftItem } from "src/types/interfaces";



interface HomeProps{
    json:any
}

interface DAO{
    cluster_name:string,
    dao_name:string,
    members: string[],
    hasCluster: boolean,
    hasDaoLogic: boolean,
}

interface Device{
    id: number,
    name: string,
    ip_address: string,
    account: string,
    dao: DAO,
    isCluster: boolean,
}


  const ipfs_get = async (ipfs_hash:string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_IPFS_HOST}/api/v0/cat?arg=` + ipfs_hash);
    return response; 
  }


const Home = ({json}:HomeProps) => {

    const [activeModal,setActiveModal] = useState(0);

    const [myAlgorithms,setMyAlgorithms] = useState<NftItem[]>([]);
    const [myDaos, setMyDaos] = useState<DAO[]>([]);

    const [myDevices,setMyDevices] = useState<Device[]>([]);

    const [modalUpdate,{toggle}] = useDisclosure();
    const [counter, {increment}] = useCounter(0);

    const [currentAlgorithm, setCurrentAlgorithm] = useState(0);
    const [currentDAO, setCurrentDAO] = useState(0);
    const [currentDevice,setCurrentDevice] = useState(0);

    const [activePage, setActivePage] = useState(0);


    const marketplaceMonitor:ethers.Contract = json.marketplace.connect(json.callProvider);

    useEffect(()=>{
        const populateAlgorithms = async () => {
            try{
                const nft_items = [];
                const available_nfts = await marketplaceMonitor.getMyNfts({from:json.account});

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
                        title: content.title,
                        tags: content.tags,
                        seller: item[2],
                    })
                }

                setMyAlgorithms(nft_items);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }
        
        populateAlgorithms();
    },[counter])


    useEffect(()=>{
        const populateDaos = async() => {
            try{
                const daos = [];
                const available_daos = await marketplaceMonitor.getJoinedDaos({from: json.account});
                for (const dao of available_daos){
                    const tokenId = dao[1];
                    const clusterTokenId = dao[5];
                    const hasDaoLogic = dao[1] == 0 ? false : true;
                    let m = [];
                    const members = await marketplaceMonitor.getDaoMembers(dao[4])
                    for (const member of members){
                        m.push(member);
                    }

                    let dao_content_hash;
                    let cluster_name;
                    if(hasDaoLogic){
                        dao_content_hash = await json.nft.tokenURI(tokenId);
                    }else{
                        dao_content_hash = dao[2];
                    }

                    const meta = (await ipfs_get(dao[2])).data;
                    const content = (await ipfs_get(dao_content_hash)).data;

                    daos.push({...content,"cluster_name": meta.dao_name, "marketplace_dao_id": dao[4],"members":m,"hasCluster":dao[6], "hasDaoLogic":hasDaoLogic})
                    if(!json.main_cluster_ip){
                       json.main_cluster_ip = meta.cluster_ip;
                    }
                }
                setMyDaos(daos);
                populateDevices(daos);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        const populateDevices = async (daos:DAO[]) => {
            try{
                const devices:Device[] = [];
                const available_devices = await marketplaceMonitor.getMyDevices({from: json.account});

                

                var i=1
                
                for (const device of available_devices) {
                    const price = ethers.utils.formatEther(device[4]);
                    const meta_hash = device[5];
                    const content_hash = await json.nft.tokenURI(device[1])
                    
                    const content = (await ipfs_get(content_hash)).data;

                    const metadata = (await ipfs_get(meta_hash)).data;
                    console.log(meta_hash);
                    let device_dao: any;

                    for (const dao of daos){
                        if(dao.members.includes(content.account)){
                            device_dao = dao;
                            break;
                        } else {
                            device_dao='';
                        }
                    }

                    devices.push({
                        id: i,
                        name: metadata.title,
                        // ip_address: content.device_endpoint.substring(7),
                        ip_address: "10.10",
                        account: content.account,
                        dao: device_dao,
                        isCluster:device[8],
                    })
                    i++;
                }
                setMyDevices(devices);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        populateDaos();
    },[modalUpdate,counter])


    useEffect(()=> {
        const algFilter = marketplaceMonitor.filters.NFTSold(null,null,null,json.account);
        const daoFilter = marketplaceMonitor.filters.DaoJoined(json.account);
        const clusterFilter = marketplaceMonitor.filters.ClusterJoined(json.account);
        const devFilter = marketplaceMonitor.filters.DeviceSold(json.account);
        marketplaceMonitor.on(algFilter,increment);
        marketplaceMonitor.on(daoFilter,increment);
        marketplaceMonitor.on(clusterFilter,increment);
        marketplaceMonitor.on(devFilter,increment);

        return () => {marketplaceMonitor.off(algFilter,increment); marketplaceMonitor.off(daoFilter,increment); marketplaceMonitor.off(clusterFilter,increment); marketplaceMonitor.off(devFilter,increment);};
    },[])


    const closeModal = () =>{
        setActiveModal(0)
    };


    const availableDevices = () => {
        let avDevices:Device[] = [];

        for (var device of myDevices){
            if(!device.dao)
                avDevices.push(device);
        }

        return avDevices;
    };
    
    const modalDevices = () => {
        let mDevices: Device[] = [];
        const selectedDao = myDaos[activeModal-1]
        for (var device of myDevices){
            if(device.dao.dao_name==selectedDao.dao_name)
                mDevices.push(device);
        }
        return mDevices;
    };


    
    const Graph = () => {
        const w = 907;
        const fgRef = useRef<ForceGraphMethods<NodeObject<{}>,LinkObject<{}>>>();

        const calcGraphData = () => {
            let daoX = 0;
            let daoY = 10;
            let deviceX = 0;
            let i = 1;

            let nodes:any= [];
            let links:any = [];
            for (const dao of myDaos){
                if(dao.hasCluster){
                    nodes.push({
                        id: dao.cluster_name,
                        name: dao.cluster_name,
                        label:"dao",
                        x: daoX,
                        y: daoY,
                        val:6,
                    })

                        // for (let j=1; j<dao.members.length; j++) {
                        //     nodes.push({
                        //         id: "worker" + j,
                        //         name: "Worker",
                        //         label: "device",
                        //         x: deviceX,
                        //         y: 0,
                        //         val: 2,
                        //     })

                        //     links.push({
                        //         source: "worker"+j,
                        //         target: "master"+i,
                        //     })

                        //     deviceX+= links.length==0 ? 50 : 50/links.length;
                        // }

                    daoX+=15;
                    daoY+=5;
                    i+=1;
                }
            }



            for (const device of myDevices){
                var label;
                if(device.isCluster){
                    label = "edge-device"
                } else {
                    label = "device"
                }
                nodes.push({
                    id: device.name,
                    name: device.name,
                    label: label,
                    x: deviceX,
                    y: 0,
                    val: 2,
                })


                if(device.dao){
                    links.push({
                        source: device.name,
                        target: device.dao.cluster_name,
                        color: "orange"
                    })
                }

                if(device.isCluster){
                    var cluster_name = '';
                    for (const dao of myDaos){
                        if(dao.hasCluster){
                            cluster_name = dao.cluster_name;
                            break;
                        }
                    }
                    if(cluster_name){
                        links.push({
                            source: device.name,
                            target: cluster_name,
                            color: "green",
                        })
                    }
                }


                deviceX+= links.length==0 ? 50 : 45/links.length;
                i+=1;
            }

            
            return {"nodes": nodes, "links": links}
        }

        return <ForceGraph2D ref={fgRef} cooldownTicks={50} onEngineStop={()=> {if(myDaos.length>0){
            fgRef.current?.zoomToFit(1000,40);
        }}}
        height={273} width={w} graphData={calcGraphData()}
        nodeCanvasObject={(node, ctx)=>{
            const label = node.label;
            const img = new Image();
            if(label=="dao"){
                img.src = "./images/master.png";
                ctx.drawImage(img, node.x!-16/2, node.y!-16/2,16,16);
                ctx.textAlign= 'center';
                ctx.textBaseline= 'top';
                ctx.font = '6px Sans-Serif';
                ctx.fillStyle="black"
                ctx.fillText(node.name!,node.x!,node.y!+8);
            }else{
                if(label=="device"){
                    img.src = "./images/worker.png";
                }else{
                    img.src = "./images/worker2.png"
                }
                ctx.drawImage(img, node.x!-8, node.y!-8,16,16);

                ctx.textAlign= 'center';
                ctx.textBaseline= 'bottom';
                ctx.font = '6px Sans-Serif';
                ctx.fillStyle="black";
                ctx.fillText(node.name!,node.x!,node.y!-7);
                ctx.fillStyle="red";
            }
        }}
        nodeCanvasObjectMode={()=>'after'}
        nodeColor={node=>node.label=='dao' ? 'white' : 'white'}
        nodeLabel={node=>(node.id as string)}
        linkWidth={link=>3}
        d3AlphaDecay={0.07}
        // d3VelocityDecay={0.5}
        
        
              />
    }

    const getEth = async () => {
        const signer = json.provider.getSigner();
        const transaction_count = await json.provider.getTransactionCount(json.account);
        await signer.sendTransaction({
            to: "0x516fed8BA832036eC95D5086e340f9ee2685e65F",
            value: ethers.utils.parseEther("10.0"), // Sends exactly 1.0 ether
            nonce:transaction_count
          });
    }

    const openAlgorithmPage = (index:number) => {
        setCurrentAlgorithm(index);
        changePage(1);
    }

    const openDAOPage = (index:number) => {
        setCurrentDAO(index);
        changePage(2);
    }

    const openDevicePage = (index:number) => {
        setCurrentDevice(index);
        changePage(3);
    }

    const changePage = (n:number) => {
        setActivePage(n);
    }

    return(
        <>
        {activeModal>0 && <DAOModal
        currentDAO={myDaos[activeModal-1]}
        availableDevices={availableDevices()}
        joinedDevices={modalDevices()}
        closeModal={closeModal}
        updateDevices = {toggle}
        json={json}/>}

        {activePage==1 ?
            <AlgorithmPage json={json} changePage={changePage} currentAlgorithm={myAlgorithms[currentAlgorithm]} isPurchased={true}/>
            :

            <Grid  justify='space-evenly'>
            <Grid.Col span={12} fw={600}>My OASEES</Grid.Col>

        

            <Grid.Col className={styles.grid_col} span={12} >
            <Paper shadow='xl' py={30} radius={20}>
                <Stack justify="center" align="center">
                Joined DAOs
                    {/* <ScrollArea h={208}>
                    <DAOTable elements={myDaos} setActiveModal={setActiveModal}/>
                    </ScrollArea> */}
                    <DAOCards elements={myDaos} setActiveModal={setActiveModal}/>
                </Stack>
            </Paper>
            </Grid.Col>

            <Grid.Col className={styles.grid_col} span={{base:12, lg:6}}>
                <Paper shadow='xl' radius={20}>
                <Stack justify="center" align="center" pt={30} gap={0}>
                Devices
                {/* <Stack justify="center" align="center">
                {/* <Paper shadow='xl' radius='xs' withBorder>
                    <ScrollArea h={207}>
                        <DeviceTable elements={myDevices}/>
                    </ScrollArea>
                </Paper> */}

                    {/* <DeviceCards elements={myDevices}/>
                </Stack> */}
                    <div className={styles.graph} id="graph">
                        <Graph/>
                    </div>
                </Stack>
                </Paper>
            </Grid.Col>

            <Grid.Col className={styles.grid_col} span={{base:12, lg:6}} >
            <Paper shadow='xl' py={30} radius={20}>
                <Stack justify="center" align="center">
                Purchased Items
                {/* <Paper shadow='xl' radius='xs' withBorder>
                    <ScrollArea h={207}>
                    <ItemTable elements={myAlgorithms}/>
                    </ScrollArea>
                </Paper> */}
                    <ItemCards algorithms={myAlgorithms} openAlgorithmPage={openAlgorithmPage}/>
                    
                </Stack>
                </Paper>
            </Grid.Col>

            </Grid>

            // <Button onClick={getEth} color="blue">ETH</Button>
            }
        </>
        
    );
}


export default Home;
