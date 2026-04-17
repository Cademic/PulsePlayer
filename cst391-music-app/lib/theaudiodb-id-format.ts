/** TheAudioDB IDs are numeric strings. */
export function isLikelyAudioDbId(value: string): boolean {
  return /^\d+$/.test(value.trim());
}
