
import styles from './notebooks.module.scss';
import classNames from 'classnames';

export interface NotebooksProps {
 className?: string;
 notebook_url: string;

}


export const Notebooks = ({ className,notebook_url}: NotebooksProps) => {

    console.log(notebook_url);

    return <div className={styles.notebook_container}>
        <iframe src={notebook_url} className={styles.notebook}/>
    </div>;
};
