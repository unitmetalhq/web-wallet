import type { Keystore } from 'ox';

export type UmKeystore = Keystore.Keystore & {
  meta: {
    type: 'secret-phrase';
    note: string;
  };
  name: string;
  address: string;
};