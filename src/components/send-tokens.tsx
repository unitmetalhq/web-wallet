import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SendNativeTokenForm from "@/components/send-native-token-form";
import SendErc20TokenForm from "@/components/send-erc20-token-form";
import SendErc721TokenForm from "@/components/send-erc721-token-form";
import SendRawTransactionForm from "@/components/send-raw-transaction-form";

export default function SendTokens() {

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Send</h1>
      </div>
      <div className="flex flex-col gap-4 px-4 py-2">
        <Tabs defaultValue="native" className="w-full">
          <TabsList className="border-primary border rounded-none">
            <TabsTrigger className="rounded-none" value="eth">
              ETH
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="erc20">
              Token
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="erc721">
              NFT
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
            <SendErc721TokenForm />
          </TabsContent>
          <TabsContent value="sign" className="flex flex-col gap-4">
            <SendRawTransactionForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
