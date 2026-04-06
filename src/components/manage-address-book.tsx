import { useState } from "react";
import { useAtom } from "jotai";
import { contactsAtom } from "@/atoms/contactsAtom";
import type { Contact } from "@/types/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { chainIdToName } from "@/lib/utils";
import { Trash2, BookUser, Search } from "lucide-react";
import CopyButton from "@/components/copy-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddContactForm from "@/components/add-contact-form";

export default function ManageAddressBook() {
  const [contacts, setContacts] = useAtom(contactsAtom);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.metadata.tags.some((t) => t.toLowerCase().includes(q)) ||
      c.metadata.note.toLowerCase().includes(q)
    );
  });

  function handleDelete(address: string) {
    setContacts((prev) => prev.filter((c) => c.address !== address));
  }

  return (
    <div className="flex flex-col border-2 border-primary gap-2 pb-8">
      <div className="flex flex-row justify-between items-center bg-primary text-secondary pl-1">
        <h1 className="text-md font-bold">Address Book</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 py-2">
        <Tabs defaultValue="addresses" className="w-full">
          <TabsList className="border-primary border rounded-none">
            <TabsTrigger className="rounded-none" value="addresses">
              Addresses
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="create">
              Create
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="import">
              Import
            </TabsTrigger>
            <TabsTrigger className="rounded-none" value="export">
              Export
            </TabsTrigger>
          </TabsList>

          {/* ── Addresses tab ───────────────────────────────────────────── */}
          <TabsContent value="addresses" className="flex flex-col gap-4">
            <div className="flex flex-row gap-2 items-center">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                className="rounded-none"
                placeholder="Search by name, address, tag, or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                <BookUser className="w-10 h-10 opacity-30" />
                {contacts.length === 0 ? (
                  <p className="text-sm">No contacts yet. Add one in the Create tab.</p>
                ) : (
                  <p className="text-sm">No contacts match your search.</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onDelete={() => handleDelete(contact.address)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Create tab ──────────────────────────────────────────────── */}
          <TabsContent value="create" className="flex flex-col gap-2">
            <AddContactForm />
          </TabsContent>

          {/* ── Import tab ──────────────────────────────────────────────── */}
          <TabsContent value="import" className="flex flex-col gap-2" />

          {/* ── Export tab ──────────────────────────────────────────────── */}
          <TabsContent value="export" className="flex flex-col gap-2" />
        </Tabs>
      </div>
    </div>
  );
}

// ── ContactCard ───────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onDelete,
}: {
  contact: Contact;
  onDelete: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{contact.name}</CardTitle>
      </CardHeader>
      {(contact.metadata.note || contact.metadata.tags.length > 0 || contact.metadata.version) && (
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="font-mono text-xs">{contact.address}</div>
            <div className="flex flex-row gap-2">
              {contact.chain !== null && (
                <div className="text-xs text-muted-foreground">{chainIdToName(contact.chain)}</div>
              )}
            </div>
            {contact.metadata.note && (
              <p className="text-muted-foreground text-xs">{contact.metadata.note}</p>
            )}
            <div className="flex flex-row flex-wrap items-center gap-2">
              {contact.metadata.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      )}
      <CardFooter className="flex flex-row gap-2 justify-between">
        <CopyButton disabledCondition={false} text={contact.address} />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-none hover:cursor-pointer hover:text-destructive"
          type="button"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

