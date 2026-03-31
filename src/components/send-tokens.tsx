// import { useState } from "react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import {
//   useConfig,
// } from "wagmi";
import SendNativeTokenForm from "@/components/send-native-token-form";
import SendErc20TokenForm from "@/components/send-erc20-token-form";
import SendRawTransactionForm from "@/components/send-raw-transaction-form";

export default function SendTokens() {
  // get Wagmi config
  // const config = useConfig();

  // const chainItems = config.chains.map((chain) => ({ label: chain.name, value: chain.id.toString() }));

  // selected chain
  // const [selectedChain, setSelectedChain] = useState<number | null>(null);

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-md font-bold">Send</h1>
      </div>
      <div className="flex flex-col gap-4 px-4 py-2">
        {/* <div className="flex flex-col gap-2">
          <Select
            items={chainItems}
            value={selectedChain?.toString() || ""}
            onValueChange={(value) => {
              // set the selected chain
              setSelectedChain(Number(value));
            }}
          >
            <SelectTrigger className="w-full border-primary border rounded-none">
              <SelectValue placeholder="Select a chain" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="border-primary border rounded-none">
              {config.chains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id.toString()}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}
        <Tabs defaultValue="native" className="w-full">
          <TabsList className="border-primary border rounded-none">
            <TabsTrigger className="rounded-none" value="eth">
              ETH
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="erc20">
              ERC20
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="erc721">
              ERC721
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="sign">
              Sign
            </TabsTrigger>
          </TabsList>
          <TabsContent value="eth">
            <SendNativeTokenForm />
          </TabsContent>
          <TabsContent value="erc20" className="flex flex-col gap-4">
            <SendErc20TokenForm />
          </TabsContent>
          <TabsContent value="erc721" className="flex flex-col gap-4">
            WIP
          </TabsContent>
          <TabsContent value="sign" className="flex flex-col gap-4">
            <SendRawTransactionForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
