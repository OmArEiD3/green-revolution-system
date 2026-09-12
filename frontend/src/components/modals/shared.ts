// Shared prop shape used by every "simple" add/action modal in this folder.
// Modals that need extra data (e.g. EditMemberModal needs the member being
// edited) extend this interface with their own additional props.
export interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
