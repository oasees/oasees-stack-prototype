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

interface Node{
    ip_address: string,
    name: string,
    role: string,
    status: string,
    account: string,
    daos: DAO[]
}

const k8s_api = `http://${process.env.REACT_APP_EXPOSED_IP}:30021/k8s_api`;
const block_explorer_api = `http://${process.env.REACT_APP_BLOCKCHAIN_HOST}:8082/api/v2/`


const kubectlRequest = async (url:string,cmd: string) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cmd })
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



  const ipfs_get = async (ipfs_hash:string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_EXPOSED_IP}:5001/api/v0/cat?arg=` + ipfs_hash);
    return response; 
  }

  const kube_get = async () => {
    const nodesData = await kubectlRequest(k8s_api,'get nodes -o json');
    
    const parseNodesDataShort = (nodesData: { items: any[]; }) => 
        nodesData?.items?.map(node => ({
            ip_address: node.status?.addresses?.find((addr: { type: string; }) => addr.type === 'InternalIP')?.address || 'Unknown',
            name: node.metadata?.name || 'Unknown',
            role: (node.metadata?.labels?.['node-role.kubernetes.io/control-plane'] === 'true' || 
                   node.metadata?.labels?.['node-role.kubernetes.io/master'] === 'true') ? 'control-plane' : 'worker',
            status: node.status?.conditions?.find((c: { type: string; }) => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady'
        })) || [];
    
    const response = parseNodesDataShort(nodesData);
    
    return response; 
}

  const get_abi = async (contract_address:string) => {
    
    const request = await axios.get(`${block_explorer_api}/smart-contracts/${contract_address}`);
    const abi = request.data.abi;

    return abi;
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

    const [myNodes,setMyNodes] = useState<Node[]>([]);


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

                console.log(available_daos);

                for (const dao of available_daos){
                    const tokenId = dao[0];
                    // const clusterTokenId = dao[5];
                    // const hasDaoLogic = dao[1] == 0 ? false : true;
                    let m = [];
                    const members = await marketplaceMonitor.getDaoMembers(dao[0])
                    for (const member of members){
                        m.push(member);
                    }

                    let dao_content_hash;
                    let cluster_name;
                    // if(hasDaoLogic){
                    //     dao_content_hash = await json.nft.tokenURI(tokenId);
                    // }else{
                    //     dao_content_hash = dao[2];
                    // }

                    // const meta = (await ipfs_get(dao[2])).data;
                    // const content = (await ipfs_get(dao_content_hash)).data;
                    

                    const governance_address = dao[1]
                    const governance_abi = await get_abi(dao[1])
                    const token_address = dao[3]
                    const token_abi  = await get_abi(dao[3])
                    const box_address = dao[4]
                    const box_abi = await get_abi(dao[4])
                    const meta = dao[5]

                    const content = {
                        "governance_address": governance_address,
                        "governance_abi": governance_abi,
                        "token_address": token_address,
                        "token_abi": token_abi,
                        "box_address": box_address,
                        "box_abi": box_abi,
                        "dao_name": meta,
                        
                    }

                    daos.push({...content,"cluster_name": meta.dao_name, "marketplace_dao_id": dao[0],"members":m,"hasCluster":false, "hasDaoLogic":true})
                }
                setMyDaos(daos);
                // populateDevices(daos);
                populateNodes(daos);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        // const populateDevices = async (daos:DAO[]) => {
        //     try{
        //         const devices:Device[] = [];
        //         const available_devices = await marketplaceMonitor.getMyDevices({from: json.account});

        //         var i=1
                
        //         for (const device of available_devices) {
        //             const price = ethers.utils.formatEther(device[4]);
        //             const meta_hash = device[5];
        //             const content_hash = await json.nft.tokenURI(device[1])
                    
        //             const content = (await ipfs_get(content_hash)).data;

        //             const metadata = (await ipfs_get(meta_hash)).data;
        //             console.log(meta_hash);
        //             let device_dao: any;

        //             for (const dao of daos){
        //                 if(dao.members.includes(content.account)){
        //                     device_dao = dao;
        //                     break;
        //                 } else {
        //                     device_dao='';
        //                 }
        //             }

        //             devices.push({
        //                 id: i,
        //                 name: metadata.title,
        //                 // ip_address: content.device_endpoint.substring(7),
        //                 ip_address: "10.10",
        //                 account: content.account,
        //                 dao: device_dao,
        //                 isCluster:device[8],
        //             })
        //             i++;
        //         }
        //         setMyDevices(devices);
        //     } catch(error){
        //         console.error('Error loading contracts: ', error);
        //     }
        // }

        const populateNodes = async (daos:DAO[]) => {
            var nodes:Node[] = [];
            try{
                const result = await kube_get();

                const data = result;
                // console.log(data[0]);
                for (const node of data){
                    var joined_daos: never[] = [];
                    var account = '';
                    // try{
                    //     var account_request = await axios.get(`http://${node.ip_address}:${node.port}/info`)
                    //     account = account_request.data.account


                    //     for (const dao of daos){
                    //         if(dao.members.includes(account)){
                    //             joined_daos.push(dao);
                    //         }
                    //     }
                    // }
                    // catch(error){
                    //     console.error(`Couldn't find a blockchain agent running on ${node.name}`);
                    // }

                    nodes.push({
                        ip_address: node.ip_address,
                        name: node.name,
                        role: node.role,
                        status: node.status,
                        account: account,
                        daos: joined_daos

                    })
                }

                setMyNodes(nodes);
                // console.log(nodes);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        populateDaos();
    },[modalUpdate,counter])

    // useEffect(()=>{
    //     const populateNodes = async () => {
    //         var nodes:Node[] = [];
    //         try{
    //             const result = await kube_get();

    //             const data = result.data.nodes;

    //             for (const node of data){
    //                 var account_request = await axios.get(`http://localhost:5000/info`)
    //                 nodes.push({
    //                     ip_address: node.internal_ip,
    //                     name: node.name,
    //                     role: node.role,
    //                     status: node.status,
    //                     account: account_request.data.account,
    //                 })
    //             }

    //             setMyNodes(nodes);
    //             console.log(nodes)
    //         } catch(error){
    //             console.error('Error loading contracts: ', error);
    //         }
    //     }
    //     populateNodes();
    // },[])


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
        let avNodes:Node[] = [];
        const selectedDao = myDaos[activeModal - 1]
        for (var node of myNodes){
            if(node.status  && node.role!='control-plane' && !node.daos.includes(selectedDao))
                avNodes.push(node);
        }

        return avNodes;
    };
    
    const modalDevices = () => {
        let mNodes: Node[] = [];
        const selectedDao = myDaos[activeModal-1]
        for (var node of myNodes){
            if(node.status  && node.role!='control-plane' && node.daos.includes(selectedDao))
                mNodes.push(node);
        }
        return mNodes;
    };


    
    const Graph = () => {
        const w = 907;
        const fgRef = useRef<ForceGraphMethods<NodeObject<{}>,LinkObject<{}>>>();

        const calcGraphData = () => {
            let daoX = 0;
            let daoY = 10;
            let deviceX = 0;
            let i = 1;
            let j = 1;

            let nodes:any= [];
            let links:any = [];
            for (const node of myNodes){
                if(node.status){
                    if(node.role=='control-plane'){
                        nodes.push({
                            id: "master",
                            name: node.name,
                            label: node.ip_address,
                            x: daoX,
                            y: daoY,
                            val:6,
                        });

                        daoX+=15;
                        daoY+=5;
                        i+=1;
                    } else {
                        nodes.push({
                            id: "device" + j,
                            name: node.name,
                            label: node.ip_address,
                            x: deviceX,
                            y: 0,
                            val: 2,
                        })
                        links.push({
                            source: "device" +j,
                            target: "master",
                        })

                        j+=1;

                        deviceX+= links.length==0 ? 50 : 50/links.length;
                    }
                }
                // if(dao.hasCluster){
                //     nodes.push({
                //         id: dao.cluster_name,
                //         name: dao.cluster_name,
                //         label:"dao",
                //         x: daoX,
                //         y: daoY,
                //         val:6,
                //     })

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

                    
            }



            // for (const device of myDevices){
            //     var label;
            //     if(device.isCluster){
            //         label = "edge-device"
            //     } else {
            //         label = "device"
            //     }
            //     nodes.push({
            //         id: device.name,
            //         name: device.name,
            //         label: label,
            //         x: deviceX,
            //         y: 0,
            //         val: 2,
            //     })


            //     if(device.dao){
            //         links.push({
            //             source: device.name,
            //             target: device.dao.cluster_name,
            //             color: "orange"
            //         })
            //     }

            //     if(device.isCluster){
            //         var cluster_name = '';
            //         for (const dao of myDaos){
            //             if(dao.hasCluster){
            //                 cluster_name = dao.cluster_name;
            //                 break;
            //             }
            //         }
            //         if(cluster_name){
            //             links.push({
            //                 source: device.name,
            //                 target: cluster_name,
            //                 color: "green",
            //             })
            //         }
            //     }


            //     deviceX+= links.length==0 ? 50 : 45/links.length;
            //     i+=1;
            // }

            
            return {"nodes": nodes, "links": links}
        }

        return <ForceGraph2D ref={fgRef} cooldownTicks={50} onEngineStop={()=> {if(myNodes.length>0){
            fgRef.current?.zoomToFit(1000,40);
        }}}
        height={273} width={w} graphData={calcGraphData()}
        nodeCanvasObject={(node, ctx)=>{
            const label = node.id as string;
            const img = new Image();
            if(label.includes("master")){
                img.src = "./images/master.png";
                ctx.drawImage(img, node.x!-16/2, node.y!-16/2,16,16);
                ctx.textAlign= 'center';
                ctx.textBaseline= 'top';
                ctx.font = '6px Sans-Serif';
                ctx.fillStyle="black"
                ctx.fillText(node.name!,node.x!,node.y!+8);
            }else{
                if(label.includes("device")){
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
        nodeColor={node=>(node.id as string).includes('master') ? 'white' : 'white'}
        nodeLabel={node=>(node.label as string)}
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
