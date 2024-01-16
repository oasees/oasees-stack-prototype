import { createBoard } from '@wixc3/react-board';
import { Publish } from '../../../components/publish/publish';

export default createBoard({
    name: 'Publish',
    Board: () => <Publish marketplace={undefined} nft={undefined} account={undefined} />
});
