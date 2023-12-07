import { useEffect, useState } from 'react';
import styles from './dao-create.module.scss';
import classNames from 'classnames';
import axios from 'axios';

export interface DaoCreateProps {
    className?: string;
    account: any;
    daoIndexerContract:any;
}


export const DaoCreate = ({ className ,account,daoIndexerContract}: DaoCreateProps)=> {


    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [formError, setFormError] = useState<boolean>(false);

    const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedTitle = event.target.value;
        setTitle(updatedTitle);
      };
    
      const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedDescription = event.target.value;
        setDescription(updatedDescription);
      };

      const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    
        if ( !title || !description ) {
          setFormError(true);
          return;
        }

        console.log(title, description);

        setFormError(false);

        // const config = {
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Accept': 'application/json',

        //     },
        //     data: {},
        //     params: {
        //         "dao_storage_hash": daoStorageHash,
        //         "governor_account": account,
        //         "dao_name":title,
        //         "dao_desc": description
        //     }
        // }

        // const resp = await axios.get(`http://${process.env.REACT_APP_IPFS_API_HOST}/create_dao`, config);
        // console.log(resp)



    }


    return (
        <div className={classNames(styles.root, className)}>
            <div className={styles.form_container}>
              <div className={styles.card}>
                <div className={styles.cardImageStyle}>  
                  <h2 className={styles.card_heading}>
                    Create Dao
                  </h2>
                </div>
                <form className={styles.card_form}>
                  <div  className={styles.input}>
                    <input onChange={handleTitleChange} type="text" className={styles.input_field}  required/>
                    <p className={styles.input_label}>Title</p>
                  </div>
                    <div className={styles.input}>
                    <input onChange={handleDescriptionChange} type="text" className={styles.input_field} required/>
                    <p className={styles.input_label}>Description</p>
                  </div>

                  <div className={styles.action}>
                    <button  onClick={handleSubmit} className={styles.action_button}>Create</button>
                  </div>

                </form>

              </div>
            </div>



        </div>
    );
};