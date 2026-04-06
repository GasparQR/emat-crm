import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SelectorListasWhatsApp from "./SelectorListasWhatsApp";

export default function DialogSelectorListasWhatsApp({ open, onOpenChange, contactoId, contactoWhatsapp, consultaId, onMessageSent }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Lista de WhatsApp</DialogTitle>
        </DialogHeader>
        <SelectorListasWhatsApp
          contactoId={contactoId}
          contactoWhatsapp={contactoWhatsapp}
          consultaId={consultaId}
          onMessageSent={() => {
            if (onMessageSent) onMessageSent();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}