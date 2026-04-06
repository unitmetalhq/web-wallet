import { Keystore, Bytes } from "ox";
import { mnemonicToAccount } from "viem/accounts";
import type { UmKeystore } from "@/types/wallet";

export function decryptWalletToAccount(wallet: UmKeystore, password: string) {
  const key = Keystore.toKey(wallet, { password });
  const mnemonicHex = Keystore.decrypt(wallet, key);
  const mnemonicPhrase = Bytes.toString(Bytes.fromHex(mnemonicHex));
  return mnemonicToAccount(mnemonicPhrase);
}
