/// <reference types="react-scripts" />
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      INFRA_HOST: string;
      IPFS_HOST: string;

    }
  }
}
