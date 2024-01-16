import styles from './service-catalogue.module.scss';
import classNames from 'classnames';
import { CardContainer } from '../card-container/card-container';

export interface ServiceCatalogueProps {
    className?: string;
    marketplace: any;
    nft: any;
    account: any;
    showall: any;
}


export const ServiceCatalogue = ({ className,marketplace,nft ,account,showall}: ServiceCatalogueProps) => {
    return (
        <div className={classNames(styles.root, className)}>
            <CardContainer marketplace={marketplace} nft={nft} account={account} showall={showall}/>
        </div>
    );
};
