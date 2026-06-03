export const LETTER_ENTRIES_PASSCODE = "faerie";
export const LETTER_ENTRIES_ACCESS_STORAGE_KEY = "kiruu_letter_entries_access_v1";

export function hasLetterEntriesAccess() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage?.getItem(LETTER_ENTRIES_ACCESS_STORAGE_KEY) === "unlocked";
}

export function unlockLetterEntriesAccess(candidate) {
  const isMatch = candidate === LETTER_ENTRIES_PASSCODE;
  if (isMatch && typeof window !== "undefined") {
    window.sessionStorage?.setItem(LETTER_ENTRIES_ACCESS_STORAGE_KEY, "unlocked");
  }
  return isMatch;
}
