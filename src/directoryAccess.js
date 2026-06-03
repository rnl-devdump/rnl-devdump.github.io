export const DIRECTORY_PASSCODE = "k1ruu_consolepass";
export const DIRECTORY_ACCESS_STORAGE_KEY = "kiruu_directory_access_v1";

export function hasDirectoryAccess() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage?.getItem(DIRECTORY_ACCESS_STORAGE_KEY) === "unlocked";
}

export function unlockDirectoryAccess(candidate) {
  const isMatch = candidate === DIRECTORY_PASSCODE;
  if (isMatch && typeof window !== "undefined") {
    window.sessionStorage?.setItem(DIRECTORY_ACCESS_STORAGE_KEY, "unlocked");
  }
  return isMatch;
}
