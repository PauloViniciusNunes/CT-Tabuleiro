import type { Card } from "../../types/card";
import type { Item } from "../../types/item";
import { ItemForm } from "./ItemForm";

interface ItemEditFormProps {
  availableCards: Card[];
  theseItem: Item;
  onSave: (item: Item) => void | Promise<void>;
  onClose: () => void;
}

/** Edit specialization of the shared Item form. */
export function ItemEditForm({ theseItem, ...props }: ItemEditFormProps) {
  return (
    <ItemForm key={theseItem.id} {...props} initialItem={theseItem} mode="edit" />
  );
}

export default ItemEditForm;
