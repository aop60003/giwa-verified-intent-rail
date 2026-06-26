export type UserReceiptListState = "verified" | "pending" | "notMatched";
export type UserReceiptListFilter = UserReceiptListState | "all";
export type UserReceiptListItem = {
  id: string;
  state: UserReceiptListState;
  actionName: string;
};

export function filterUserReceipts(items: UserReceiptListItem[], filter: UserReceiptListFilter): UserReceiptListItem[] {
  if (filter === "all") return items;
  return items.filter((item) => item.state === filter);
}
