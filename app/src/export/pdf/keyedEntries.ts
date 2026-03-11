/**
 * Adds stable keys for repeated PDF text entries, even when the same string
 * appears more than once in the same list.
 *
 * @param items - Ordered text items that need deterministic React keys.
 * @param prefix - Per-list prefix to avoid collisions across different blocks.
 * @returns Keyed entry objects that preserve the original item order.
 */
export const toKeyedEntries = (items: string[], prefix: string) => {
  const seenCounts = new Map<string, number>();

  return items.map((item) => {
    const count = (seenCounts.get(item) ?? 0) + 1;
    seenCounts.set(item, count);
    return {
      key: `${prefix}:${item}:${count}`,
      value: item,
    };
  });
};
