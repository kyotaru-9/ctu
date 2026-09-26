export function cx(...parts) {
  return parts
    .flat(Infinity)
    .filter((part) => typeof part === 'string' && part.length > 0)
    .join(' ')
}
