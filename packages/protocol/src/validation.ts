import { isAddress } from "viem";
import type { Address, Hex } from "./types.ts";

export function requireTrimmedString(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} must be a non-empty trimmed string`);
  }

  return trimmed;
}

export function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeAddress(value: string, field: string): Address {
  if (!isAddress(value, { strict: false })) {
    throw new Error(`${field} must be a valid address`);
  }

  return value.toLowerCase() as Address;
}

export function normalizeHex(value: string, field: string): Hex {
  if (!/^0x[a-fA-F0-9]*$/.test(value)) {
    throw new Error(`${field} must be a 0x-prefixed hex string`);
  }

  return value.toLowerCase() as Hex;
}

export function normalizeBytes4(value: string): Hex {
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) {
    throw new Error("selector must be bytes4");
  }

  return value.toLowerCase() as Hex;
}

export function normalizeBytes32(value: string, field: string): Hex {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${field} must be bytes32`);
  }

  return value.toLowerCase() as Hex;
}

export function requireBaseUnitString(value: string, field: string): string {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${field} must be a base-unit decimal string`);
  }

  return value;
}

export function requirePositiveInteger(value: number | undefined, field: string): number {
  if (!Number.isInteger(value) || value === undefined || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }

  return value;
}

export function requireNonNegativeInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }

  return value;
}
