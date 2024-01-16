import { createBoard } from '@wixc3/react-board';
import { Card } from '../../../components/card/card';



export default createBoard({
    name: 'Card',
    Board: () => <Card nftjson={{
        id: '',
        img_url: '',
        title: '',
        desc: '',
        price: '',
        btn_act: '',
        nft_address: ''
    }}  marketplace={undefined} nft={undefined} account={undefined} showall={undefined} />

});
