import styles from './home.module.scss';
import classNames from 'classnames';
import { CardContainer } from '../card-container/card-container';


export interface HomeProps {
    className?: string;
    marketplace: any;
    nft: any;
    account: any;
    showall: any;
}

export const Home = ({ className,marketplace,nft,account,showall}: HomeProps) => {

    return (
        <div className={classNames(styles.root, className)}>
            <CardContainer marketplace={marketplace} nft={nft} account={account} showall={showall} />
        </div>



    );
};
