import type { Card } from "../../types/card";
import type { Campaign, User } from "../../types/campaign";
import type { Item } from "../../types/item";
import type { Token } from "../../types/token";
import { TokenModelForm } from "./TokenModelForm";

interface TokenEditFormProps {
  theseToken: Token;
  onSave: (token: Token) => void | Promise<void>;
  onClose: () => void;
  cards: Card[];
  items: Item[];
  users: User[];
  campaign: Campaign | null;
  tokens?: Token[];
}

/** Edit specialization of the shared Token form. */
export function TokenEditForm({ theseToken, ...props }: TokenEditFormProps) {
  return (
    <TokenModelForm
      key={theseToken.id}
      {...props}
      initialToken={theseToken}
      mode="edit"
    />
  );
}

export default TokenEditForm;
