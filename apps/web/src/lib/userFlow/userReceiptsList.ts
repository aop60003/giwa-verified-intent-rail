export type UserReceiptListState = "verified" | "pending" | "notMatched";
export type UserReceiptListFilter = UserReceiptListState | "all";
export type UserReceiptListItem = {
  id: string;
  state: UserReceiptListState;
  actionName: string;
};

export type PartitionedUserReceipts = {
  acquired: Array<UserReceiptListItem & { state: "verified" }>;
  recovery: Array<UserReceiptListItem & { state: "pending" | "notMatched" }>;
};

export function filterUserReceipts(items: UserReceiptListItem[], filter: UserReceiptListFilter): UserReceiptListItem[] {
  if (filter === "all") return items;
  return items.filter((item) => item.state === filter);
}

export function partitionUserReceipts(
  items: UserReceiptListItem[]
): PartitionedUserReceipts {
  return {
    acquired: items.filter(
      (item): item is UserReceiptListItem & { state: "verified" } =>
        item.state === "verified"
    ),
    recovery: items.filter(
      (
        item
      ): item is UserReceiptListItem & {
        state: "pending" | "notMatched";
      } => item.state !== "verified"
    )
  };
}
