import { Flex, Group, Image, Paper, ScrollArea, Text } from "@mantine/core";


interface DeviceCardProps{
    elements: any[];
}

const DeviceCards = ({elements}:DeviceCardProps) => {
    const device_cards = elements.map((device,index)=>(
        <Paper shadow='xl' bg="var(--mantine-color-gray-2" withBorder key={index} radius={0}>
            <Group justify="center" gap={0} h={91}>
                <Flex w={50} justify="center">
                    <Image src="./images/device_icon.png" w={32} alt="Device icon"/>
                </Flex>
                <Flex direction="column" my={5} gap={5} w={170}>
                    <Text fw={600}>{device.name}</Text>
                    <Group fz={14} gap={10}><b>IP:</b>{device.ip_address}</Group>
                    <Group fz={14} gap={10}><b>Used in:</b>{device.dao ? device.dao : "--"}</Group>
                </Flex>
            </Group>
            </Paper>
    ))

    return(
        <ScrollArea h={207}>
        <Flex wrap="wrap" align="center" justify="center" gap={20} maw={1000}>
            {device_cards}
        </Flex>
        </ScrollArea>
    )

}


export default DeviceCards;