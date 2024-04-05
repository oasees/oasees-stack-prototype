import { Flex, Group, Image, Paper, ScrollArea, Text } from "@mantine/core";

interface ItemCardProps{
    elements: any[];
}

const ItemCards = ({elements}:ItemCardProps) => {
    const item_cards = elements.map((item,index)=>(
        <Paper shadow='xl' bg="var(--mantine-color-gray-2)" withBorder key={index} radius={0}>
            <Group justify="center" gap={0} align="center" h={91}>
                <Flex w={50} justify="center" align="center">
                    <Image src="./images/catalogue.png" w={32} alt="Item icon"/>
                </Flex>
                <Flex direction="column" my={5} gap={5} w={170}>
                    <Text fw={600}>{item[0]}</Text>
                </Flex>
            </Group>
            </Paper>
    ))

    return(
        <ScrollArea h={207}>
        <Flex wrap="wrap" align="center" justify="center" gap={20} maw={1000}>
            {item_cards}
        </Flex>
        </ScrollArea>
    )

}


export default ItemCards;