import {Table} from "@mantine/core";

interface ItemTableProps {
    elements: string[][];
}

const headers = ['#', 'Name', 'Price (eth)', 'Deployed On'];


const ItemTable = ({elements}: ItemTableProps) => {
    

    const cols = headers.map((header,index)=>(
        <Table.Th key={index}>{header}</Table.Th>
    ));

    const rows = elements.map((element,index)=>(
        <Table.Tr key={index}>
            <Table.Td>{index+1}</Table.Td>
            <Table.Td>{element[0]}</Table.Td>
            <Table.Td>{element[1]}</Table.Td>
            <Table.Td>{element[2]}</Table.Td>
        </Table.Tr>
    ));

    return(
        <Table striped={true} stripedColor="var(--mantine-color-gray-1)" stickyHeader borderColor="black">
            <Table.Thead>
                <Table.Tr>
                    {cols}
                </Table.Tr>
            </Table.Thead>

            <Table.Tbody>{rows}</Table.Tbody>
        </Table>
    )
}



export default ItemTable;