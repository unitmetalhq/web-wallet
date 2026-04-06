import { useState } from "react";
import { useAtomValue } from "jotai";
import { contactsAtom } from "@/atoms/contactsAtom";
import { walletsAtom } from "@/atoms/walletsAtom";
import { activeWalletAtom } from "@/atoms/activeWalletAtom";
import { InputGroupButton } from "@/components/ui/input-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookUser, Search } from "lucide-react";

export default function AddressBookPickerButton({
  onSelect,
}: {
  onSelect: (address: string) => void;
}) {
  const contacts = useAtomValue(contactsAtom);
  const wallets = useAtomValue(walletsAtom);
  const activeWallet = useAtomValue(activeWalletAtom);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.toLowerCase();
  const filteredWallets = wallets.filter(
    (w) => w.name.toLowerCase().includes(q) || w.address.toLowerCase().includes(q)
  );
  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
  );

  function handleSelect(address: string) {
    onSelect(address);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      <InputGroupButton
        type="button"
        onClick={() => setOpen(true)}
        title="Pick from address book"
        className="hover:cursor-pointer"
      >
        <BookUser className="w-3.5 h-3.5" />
      </InputGroupButton>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(""); }}>
        <DialogContent className="w-full max-w-sm md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Address Book</DialogTitle>
          </DialogHeader>
          <div className="flex flex-row gap-2 items-center">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder="Search name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="border-t border-border" />
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {filteredWallets.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground px-2 pt-1">My addresses</p>
                {filteredWallets.map((w) => {
                  const isCurrent = activeWallet?.address === w.address;
                  return (
                    <button
                      key={w.address}
                      type="button"
                      className="flex flex-col px-2 py-1.5 hover:bg-muted hover:cursor-pointer text-left gap-0.5"
                      onClick={() => handleSelect(w.address)}
                    >
                      <div className="flex flex-row items-center gap-2">
                        <span className="font-medium text-xs">{w.name}</span>
                        {isCurrent && <Badge variant="outline" className="text-[10px] px-1 py-0 leading-4">current</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{w.address}</span>
                    </button>
                  );
                })}
              </>
            )}
            {filtered.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground px-2 pt-1">Contacts</p>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex flex-col px-2 py-1.5 hover:bg-muted hover:cursor-pointer text-left gap-0.5"
                    onClick={() => handleSelect(c.address)}
                  >
                    <span className="font-medium text-xs">{c.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{c.address}</span>
                  </button>
                ))}
              </>
            )}
            {filteredWallets.length === 0 && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {wallets.length === 0 && contacts.length === 0 ? "No addresses saved yet." : "No results match."}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
