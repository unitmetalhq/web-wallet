import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useConfig,
} from "wagmi";
import SendNativeTokenForm from "@/components/send-native-token-form";
import SendErc20TokenForm from "@/components/send-erc20-token-form";


export default function SendTokens() {
  // get Wagmi config
  const config = useConfig();

  // selected chain
  const [selectedChain, setSelectedChain] = useState<number | null>(null);

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
        <h1 className="text-lg font-bold">Send</h1>
      </div>
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-col gap-2">
          <Select
            value={selectedChain?.toString() || ""}
            onValueChange={(value) => {
              // set the selected chain
              setSelectedChain(Number(value));
            }}
          >
            <SelectTrigger className="w-full border-primary border rounded-none">
              <SelectValue placeholder="Select a chain" />
            </SelectTrigger>
            <SelectContent className="border-primary border rounded-none">
              {config.chains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id.toString()}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tabs defaultValue="native" className="w-full">
          <TabsList className="border-primary border rounded-none">
            <TabsTrigger className="rounded-none" value="native">
              {selectedChain
                ? config.chains.find(
                    (c) => c.id.toString() === selectedChain?.toString()
                  )?.nativeCurrency.symbol || "Native"
                : "Native"}
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="erc20">
              ERC20
            </TabsTrigger>
          </TabsList>
          <TabsContent value="native">
            <SendNativeTokenForm selectedChain={selectedChain} />
          </TabsContent>
          <TabsContent value="erc20" className="flex flex-col gap-4">
            <SendErc20TokenForm selectedChain={selectedChain} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
