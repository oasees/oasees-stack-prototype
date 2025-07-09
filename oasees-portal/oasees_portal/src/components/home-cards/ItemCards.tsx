import { Card, Flex, Group, Image, ScrollArea, Text } from "@mantine/core";
import Markdown from "react-markdown";
import { NftItem } from "src/types/interfaces";

interface ItemCardProps{
    algorithms: NftItem[];
    openAlgorithmPage:(n:number) => void
}


const ItemCards = ({algorithms,openAlgorithmPage}:ItemCardProps) => {
    const removeMd = require('remove-markdown');

    const truncate_middle = (str:string) => {
        if (str.length > 35) {
          return str.substring(0, 6) + '...' + str.substring(str.length-4, str.length);
        }
        return str;
    }
    
    const card_algorithms = algorithms.map((item,index) => (
        <Card key={index} w={300} radius={0} withBorder className="newCard" h={200} padding={20} py={25} onClick={()=>openAlgorithmPage(index)}>
            <Flex justify="center">
            <Group gap={8} align="center">
                <Image src="./images/asset.png" w={15} h={15}/>
                <Text fz={10} mt={0}>ASSET | ALGORITHM</Text>
            </Group>
            </Flex>
            <Text fw={600} mt={13} c="#00304e" truncate="end">{item.title.replaceAll('_', ' ').replace('.py', '')}</Text>
            {/* <Text fz={13} mt={5}>{truncate_middle(item.seller!)}</Text> */}
            <Flex w="100%" h={110} p={0} direction="column" justify="space-between" mt={15}>
                    <Markdown disallowedElements={['hr', 'strong','ul','h1','h2']} 
                        className="markdown_desc">
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
    ));

    return(
        <ScrollArea h={227}>
        <Flex wrap="wrap"  justify="center" gap={20} maw={1000} p={10}>
            {card_algorithms}
        </Flex>
        </ScrollArea>
    )

}


export default ItemCards;