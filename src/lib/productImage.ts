export function resolveProductImage(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null

  // If it's a string, trim and check
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed === '') return null

    // Check if it's a JSON array string
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return resolveFromArray(parsed)
        }
      } catch {
        // failed parsing JSON, treat as simple string
      }
    }

    // Treat as simple string
    if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
    return null
  }

  // If it's an array
  if (Array.isArray(raw)) {
    return resolveFromArray(raw)
  }

  return null
}

function resolveFromArray(arr: unknown[]): string | null {
  if (arr.length === 0) return null
  const first = arr[0]
  if (typeof first === 'string') {
    const trimmed = first.trim()
    if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
  }
  return null
}
