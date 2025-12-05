import { AppShell, Image, Center, Button, Stack, Flex, ScrollArea, Burger } from "@mantine/core";
import './Portal.css'
import '../tables/Table.css'
import { useState } from "react";
import SideMenu from "../side-menu/SideMenu";
import Home from "../home-page/Home";
import Marketplace from "../marketplace-page/Marketplace";
import Publish from "../publish-page/Publish";
import Notebook from "../notebook-page/Notebook";
import DApp from "../dapp-page/DApp";
import { useDisclosure } from "@mantine/hooks";
import axios from 'axios';
import Ide from "../ide-page/Ide";
import SSI from "../ssi-page/SSI";

interface PortalProps {
  json: any;
  setIsConnected: any;
  setInfo: any;
}

const Portal = ({ json, setIsConnected, setInfo }: PortalProps) => {

  const [pageId, setPageId] = useState(1);
  const [opened, { toggle }] = useDisclosure();

  const triggerJob = async () => {
    try {
      const response = await axios.post(`http://${process.env.REACT_APP_EXPOSED_IP}:30001/reset-hardhat`);

      const data = await response.data;


      console.log(data)
    } catch (err) {
      console.log(err)
    };
  }

  const handleJoining = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const button: HTMLButtonElement = event.currentTarget;
    const device_account = "0x319119cDeECfBBdC3060e09B2E0bC0b4D681cad9";

    try {
      const transaction_count = await json.provider.getTransactionCount(json.account);
      const register_device_to_dao = await json.marketplace.registerDeviceToDao(device_account, 1, { nonce: transaction_count });

      await Promise.all([
        register_device_to_dao.wait(),
      ]);


    } catch (error) {
      console.error("Metamask error: ", error);
    }
  };

  const changeCurrentPage = (v: number) => {
    toggle();
    setPageId(v);
  }

  const mapCurrentPage = () => {
    switch (pageId) {
      case 2:
        return <DApp json={json} />;
      case 3:
        return <Marketplace json={json} />;
      case 4:
        return <Publish json={json} />;
      case 5:
        return <Notebook json={json} />;
      case 6:
        return <Ide json={json} />;
      case 7:
        return <SSI json={json} />;
      default:
        return <Home json={json} />;
    }
  }


  return (
    <AppShell
      header={{ height: 32 }}
      navbar={{
        width: { base: 190, sm: 215, xl: 300 },
        breakpoint: 'xs',
        collapsed: { mobile: !opened }
      }}
      layout="alt"
      padding="md"
    >

      <AppShell.Header withBorder={false} zIndex={1000} hiddenFrom="xs">
        <Flex justify="center" align="center">
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="xs"
            size="md"

          />
        </Flex>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section p={20}>
          <Center>
            <Image src="./images/oasees-logo.png" alt="Oasees logo" mah={150} w="auto" />
          </Center>
        </AppShell.Section>


        <AppShell.Section grow component={ScrollArea} pt={20}>
          <Center>
            <SideMenu currentPage={pageId} onTabClick={changeCurrentPage} />
          </Center>
        </AppShell.Section>

        <AppShell.Section>
          <Flex justify="center" hiddenFrom="xs">
            <Button color='orange' w={200} h={45} onClick={setIsConnected}>Disconnect</Button>
          </Flex>
        </AppShell.Section>

      </AppShell.Navbar>


      <AppShell.Main >
        <Stack>

          <Flex justify='flex-end' visibleFrom="xs" gap={10}>
            <Button color='blue' w={200} h={45} component="a" href="http://10.160.3.172:8082" target="_blank" rightSection={<Image src="./images/external-link-white.png" w={12} h={12} alt="External Link icon" />}>Blockscout</Button>
            <Button color='orange' w={200} h={45} onClick={setIsConnected}>Disconnect</Button>
          </Flex>

          {mapCurrentPage()}

        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export default Portal;