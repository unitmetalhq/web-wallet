export function validateUrl(url: string): string | null {
  if (!url.trim()) return "RPC URL is required";
  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "RPC URL must use http or https";
    }
  } catch {
    return "Invalid URL";
  }
  return null;
}
