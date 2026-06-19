const MESSAGE_TO_CODE = new Map<string, string>([
  ["Request body must be an object", "invalid_request_body"],
  ["depositTxHash already belongs to another run", "deposit_tx_hash_already_used"],
  ["depositTxHash already has a terminal decision", "deposit_tx_hash_already_decided"],
  ["run does not exist", "run_not_found"],
  ["matched verifier result must include receipt", "matched_receipt_required"],
  ["tenant_body_not_allowed", "tenant_body_not_allowed"],
  ["unauthorized", "unauthorized"],
  ["forbidden", "forbidden"],
  ["rate_limited", "rate_limited"],
  ["method_not_allowed", "method_not_allowed"],
  ["unsupported_media_type", "unsupported_media_type"]
]);

export type LiveApiErrorBody = { error: string; requestId?: string };

export function toLiveApiErrorBody(error: unknown, requestId?: string): LiveApiErrorBody {
  const withRequestId = (code: string): LiveApiErrorBody =>
    requestId === undefined ? { error: code } : { error: code, requestId };
  if (!(error instanceof Error)) return { error: "internal_error" };

  return withRequestId(MESSAGE_TO_CODE.get(error.message) ?? "internal_error");
}
