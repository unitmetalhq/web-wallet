import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InformationDialog({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground hover:cursor-pointer"
          />
        }
      >
        <Info className="w-3.5 h-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-xs/relaxed text-muted-foreground">{content}</p>
      </DialogContent>
    </Dialog>
  );
}
