export interface TransactionParam {
  name: string;
  value: string;
  type: string;
}

export interface TransactionInputs {
  description: string;
  action: string;
  params: TransactionParam[];
}

export interface TransactionExport {
  chain: number;
  to: string;
  value?: string;
  data?: string;
  inputs: TransactionInputs;
}
