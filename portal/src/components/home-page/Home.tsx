import {Grid, Paper, Stack } from "@mantine/core";
import DAOModal from "../dao-modal/DAOModal";
import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useCounter, useDisclosure } from "@mantine/hooks";
import DAOCards from "../home-cards/DAOCards";
import ItemCards from "../home-cards/ItemCards";
import styles from "./Home.module.css"
import "./Home.css"
import ForceGraph2D, {ForceGraphMethods,NodeObject,LinkObject} from "react-force-graph-2d";


interface HomeProps{
    json:any
}

interface DAO{
    dao_name:string,
    members: string[],
}

interface Device{
    id: number,
    name: string,
    ip_address: string,
    account: string,
    dao: string
}


  const ipfs_get = async (ipfs_hash:string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_IPFS_HOST}/api/v0/cat?arg=` + ipfs_hash);
    return response; 
  }


const Home = ({json}:HomeProps) => {

    const [activeModal,setActiveModal] = useState(0);

    const [myAlgorithms,setMyAlgorithms] = useState<string[][]>([]);
    const [myDaos, setMyDaos] = useState<DAO[]>([]);

    const [myDevices,setMyDevices] = useState<Device[]>([]);

    const [modalUpdate,{toggle}] = useDisclosure();
    const [counter, {increment}] = useCounter(0);


    const marketplaceMonitor:ethers.Contract = json.marketplace.connect(json.callProvider);

    

    useEffect(()=>{
        const populateAlgorithms = async () => {
            try{
                const nft_items = [];
                const available_nfts = await marketplaceMonitor.getMyNfts({from:json.account});

                for (const item of available_nfts) {
                    const price = ethers.utils.formatEther(item[4]);
                    const meta_hash = item[5];
                
                    const content = JSON.parse((await ipfs_get(meta_hash)).data);
                    nft_items.push([
                        content.title,
                        price,
                        '--',
                    ])
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
                    const dao_content_hash = await json.nft.tokenURI(dao[1]);
                    const content = (await ipfs_get(dao_content_hash)).data;
                    let m = [];

                    //TEST
                    const members = await marketplaceMonitor.getDaoMembers(dao[4])
                    for (const member of members){
                        m.push(member);
                    }

                    daos.push({...content,"marketplace_dao_id": dao[4],"members":m})
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
                    const metadata = JSON.parse((await ipfs_get(meta_hash)).data);
                    let device_dao ='';

                    for (const dao of daos){
                        if(dao.members.includes(content.account)){
                            device_dao = dao.dao_name;
                            break;
                        }
                    }

                    devices.push({
                        id: i,
                        name: metadata.title,
                        ip_address: content.device_endpoint.substring(7),
                        account: content.account,
                        dao: device_dao
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
        const devFilter = marketplaceMonitor.filters.DeviceSold(json.account);
        marketplaceMonitor.on(algFilter,increment);
        marketplaceMonitor.on(daoFilter,increment);
        marketplaceMonitor.on(devFilter,increment);

        return () => {marketplaceMonitor.off(algFilter,increment); marketplaceMonitor.off(daoFilter,increment); marketplaceMonitor.off(devFilter,increment);};
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
            if(device.dao==selectedDao.dao_name)
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
            for (const dao of myDaos){
                    
                    nodes.push({
                        id: dao.dao_name,
                        name: dao.dao_name,
                        label:"dao",
                        x: daoX,
                        y: daoY,
                        val:12,
                    })

                    daoX+=70;
                    i+=1;
                
            }


            let links:any = [];

            for (const device of myDevices){
                nodes.push({
                    id: device.ip_address,
                    name: device.name,
                    label: "device",
                    x: deviceX,
                    y: 0,
                    val: 5,
                })

                if(device.dao){
                    links.push({
                        source: device.ip_address,
                        target: device.dao,
                    })
                }


                deviceX+= links.length==0 ? 50 : 50/links.length;
                i+=1;
            }

            
            return {"nodes": nodes, "links": links}
        }

        // graphData={{
        //     "nodes": [
        //         {
        //           id: "id1",
        //           name:"name1",
        //           label:"dao",
        //           x:0,
        //           y:50,
        //           val:12,
        //         },
        //         { 
        //           id: "id2",
        //           name: "name2",
        //           label:"dao",
        //           val:12,
        //           x:70,
        //           y:30,
        //         },
        //         {
        //             id:"id3",
        //             name:"name3",
        //             label:"dao",
        //             val:12,
        //             x:140,
        //             y:50,
        //         },
        //         {
        //             id:"id4",
        //             name:"name4",
        //             val:5,
        //             x:0,
        //             y:0,
        //         },
        //         {
        //             id:"id5",
        //             name:"name5",
        //             val:5,
        //             x:50,
        //             y:0,
        //         },
        //         {
        //             id:"id6",
        //             name:"name6",
        //             val:5,
        //             x:100,
        //             y:0,
        //         },
        //     ],
        //     "links": [
        //         {
        //             "source": "id4",
        //             "target": "id1"
        //         },
        //         {
        //             "source": "id5",
        //             "target": "id1"
        //         },
        //         {
        //             "source": "id6",
        //             "target": "id2"
        //         },
        //     ]
        // }}

        return <ForceGraph2D ref={fgRef} cooldownTicks={50} onEngineStop={()=> {if(myDaos.length>0){fgRef.current?.zoomToFit(1000,40)}}} height={253} width={w} graphData={calcGraphData()}
        nodeCanvasObject={(node, ctx)=>{
            const label = node.label;
            const img = new Image();
            if(label=="dao"){
                img.src = "./images/dao_icon.png";
                const sx=32*1.24;
                ctx.drawImage(img, node.x!-sx/2, node.y!-16,sx,32);
                ctx.textAlign= 'center';
                ctx.textBaseline= 'top';
                ctx.font = '6px Sans-Serif';
                ctx.fillStyle="black"
                ctx.fillText(node.name!,node.x!,node.y!+14);
            }else{
                img.src = "./images/device_icon.png";
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
        linkColor={link=>'#f9aa5d'}
        d3AlphaDecay={0.07}
        // d3VelocityDecay={0.5}
        
        
              />
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
                <ItemCards elements={myAlgorithms}/>
            </Stack>
            </Paper>
        </Grid.Col>
        
        <Grid.Col span={12}>
            
        </Grid.Col>

        </Grid>
        
        </>
    );
}


export default Home;