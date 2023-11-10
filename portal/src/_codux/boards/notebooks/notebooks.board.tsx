import { createBoard } from '@wixc3/react-board';
import { Notebooks } from '../../../components/notebooks/notebooks';

export default createBoard({
    name: 'Notebooks',
    Board: () => <Notebooks notebook_url=''/>
});
