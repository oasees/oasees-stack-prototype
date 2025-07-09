import {Table} from "@mantine/core";

interface DeviceTableProps{
    elements: any[];
}

const headers = ['#', 'Name', 'IP', 'Used in'];


const DeviceTable = ({elements}:DeviceTableProps) => {
    const cols = headers.map((header,index)=>(
        <Table.Th key={index}>{header}</Table.Th>
    ));

    const rows = elements.map((element,index)=>(
        <Table.Tr key={index}>
            <Table.Td>{index+1}</Table.Td>
            <Table.Td>{element.name}</Table.Td>
            <Table.Td>{element.ip_address}</Table.Td>
            <Table.Td>{element.dao}</Table.Td>
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



export default DeviceTable;