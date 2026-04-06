import type { Keystore } from 'ox';

export type UmKeystore = Keystore.Keystore & {
  meta: {
    type: string;
    note: string;
    umVersion?: string;
  };
  name: string;
  address: string;
};