import React, { useEffect, useState } from 'react';
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css';
import { Button, Card, Center, Group, SimpleGrid } from '@mantine/core';
import axios from 'axios';
import DApp from './DApp';


async function hitDApp(action:string){

    const config = {
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',

      },
      data: {},
      params: {
      }
    }

    try{
    const response = await axios.get(`http://10.160.1.225:8000/${action}`,config);

    }catch(error){
        console.error(error);
    }
    return 

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

async function IpfsGetDapp(_ipfs_hash:string){

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

  const response = await axios.get(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_fetch_dapp`,config);


  return response.data.content;

}

interface DAppProps{
  json:any
}


function DAppContainer({json}:DAppProps) {
  const marketplaceMonitor = json.marketplace.connect(json.callProvider);

  const [dapps, setDapps] = useState<string[]>([]);
  const [activeDApp, setActiveDApp] = useState(-1);
  const [dappInfos, setDappInfos] = useState<any[]>([]);

  const [deviceEndpoint,setDeviceEndpoint] = useState('');

  useEffect(()=>{
    const getDAppHashes = async () => {
      try{
        let dapp_pages = [];
        let dapp_infos = [];
        const available_daos = await marketplaceMonitor.getJoinedDaos({from: json.account});
        for (const dao of available_daos){
          const dao_content_hash = await json.nft.tokenURI(dao[1]);
          const content = await IpfsGet(dao_content_hash);
          const name = content.dapp_info.NAME;
          const description = content.dapp_info.DESCRIPTION;


          const dapp_page = await IpfsGetDapp(content.dapp);

          dapp_pages.push(dapp_page);
          dapp_infos.push({name:name, description:description})
        }

        setDapps(dapp_pages);
        setDappInfos(dapp_infos);

      } catch(error){
          console.error('Error loading contracts: ', error);
      }
    }

    getDAppHashes();
  },[])

  useEffect(()=>{
    const getDevice = async() => {
      try{
        const available_devices = await marketplaceMonitor.getMyDevices({from: json.account});
        if(available_devices.length>0){
          const device = available_devices[0];

          const content_hash = await json.nft.tokenURI(device[1]);
          const content = await IpfsGet(content_hash);
          setDeviceEndpoint(content.device_endpoint);
        }
      } catch (error) {
        console.error(error);
      }
    }

    getDevice();
  },[])

  const play = () => {
    hitDApp("play");
  }

  const record = () => {
    hitDApp("record");
  }

  const dapp_cards = dapps.map((dapp,index)=>(
    <Card shadow="sm" padding="lg" radius="md" withBorder ta="center" key={index}>
      <h3>{dappInfos[index].name}</h3>
      <h4>{dappInfos[index].description}</h4>
      <Button color="orange" onClick={()=>setActiveDApp(index)}>Show DApp</Button>
    </Card>
  ))

  const handleClose = () => {
    setActiveDApp(-1);
  }


  const pageContent = () => {
    if(activeDApp<0){
      return( 
        <SimpleGrid cols={{base:1, sm:2, md:3, lg:4}}>
          {dapp_cards}
        </SimpleGrid>
      );
    }
    else{
      return <DApp html_page={dapps[activeDApp]} closeFunction={handleClose} device_endpoint={deviceEndpoint}/>
    }
  }

  return (
    <>
      <Center pt={20}>DApps</Center>
      {pageContent()}
    </>
  );
}

export default DAppContainer;