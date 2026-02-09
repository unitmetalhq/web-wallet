// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useForm } from "@tanstack/react-form";
// import type { AnyFieldApi } from "@tanstack/react-form";
// import { Loader2 } from "lucide-react";
// import { useAtomValue, useSetAtom } from "jotai";
// import { settingsAtom } from "@/atoms/settingsAtom";
// import type { UmSetting } from "@/types/setting";
// import { useConfig } from "wagmi";

// export default function WalletSettings() {

//   // get Wagmi config
//   const config = useConfig();

//   const setSettings = useSetAtom(settingsAtom);
//   const settings = useAtomValue<UmSetting>(settingsAtom);

//   const form = useForm({
//     defaultValues: {
//       rpcInfo: [{
//         url: "",
//         chainId: null,
//       }]
//     },
//     onSubmit: async ({ value }) => {
//       console.log(value);
//     },
//   });


//   return (
//     <div className="flex flex-col border-2 border-primary gap-2 pb-8">
//       <div className="flex flex-row justify-between items-center bg-primary text-secondary p-1">
//         <h1 className="text-lg md:text-xl font-bold">Settings</h1>
//       </div>
//       <div className="flex flex-col gap-4 px-4 py-2">
//         <div className="flex flex-col gap-2">
//           <h2 className="text-lg font-bold">RPC Info</h2>
//         </div>
//         <div className="flex flex-col gap-2">
//           {
//             config.chains.map((chain) => (
//               <div key={chain.id}>
//                 <h3 className="text-md font-bold">{chain.name}</h3>
//                 <Input
//                   value={chain.rpcUrls.default.http[0]}
//                   onChange={(e) => {
//                     console.log(e.target.value);
//                   }}
//                 />
//               </div>
//             ))
//           }
//         </div>
//       </div>
//     </div>
//   );
// }
