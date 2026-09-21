import type { Card } from "../../types/card";
import { CardModelForm } from "./CardModelForm";

interface CardEditFormProps {
  theseCard: Card;
  onSave: (card: Card) => void | Promise<void>;
  onClose: () => void;
}

/** Edit specialization of the shared Card form. */
export function CardEditForm({ theseCard, ...props }: CardEditFormProps) {
  return (
    <CardModelForm
      key={theseCard.id}
      {...props}
      initialCard={theseCard}
      mode="edit"
    />
  );
}

export default CardEditForm;
