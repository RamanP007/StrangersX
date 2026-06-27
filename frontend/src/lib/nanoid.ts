// Tiny ID generator — avoids pulling in a separate package
export function nanoid(): string {
  return Math.random().toString(36).slice(2, 11)
}
