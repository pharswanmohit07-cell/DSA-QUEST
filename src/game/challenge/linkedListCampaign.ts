export type LinkedListNode = { id: string; value: number; nextId: string | null }

export function createLinkedList(values: readonly number[]): LinkedListNode[] {
  return values.map((value, index) => ({ id: 'node-' + index, value, nextId: index + 1 < values.length ? 'node-' + (index + 1) : null }))
}

export function relinkLinkedList(nodes: readonly LinkedListNode[], orderedIds: readonly string[]): LinkedListNode[] | null {
  if (orderedIds.length !== nodes.length) return null
  const ids = new Set(nodes.map((node) => node.id))
  const ordered = new Set(orderedIds)
  if (ids.size !== nodes.length || ordered.size !== orderedIds.length || ordered.size !== ids.size || orderedIds.some((id) => !ids.has(id))) return null
  const nextById = new Map<string, string | null>()
  orderedIds.forEach((id, index) => nextById.set(id, orderedIds[index + 1] ?? null))
  return nodes.map((node) => ({ ...node, nextId: nextById.get(node.id) ?? null }))
}

export function traverseLinkedList(nodes: readonly LinkedListNode[], headId: string | null): number[] {
  if (headId === null) return []
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (byId.size !== nodes.length) return []
  const result: number[] = []
  const visited = new Set<string>()
  let nextId: string | null = headId
  while (nextId !== null) {
    if (visited.has(nextId)) return []
    visited.add(nextId)
    const node = byId.get(nextId)
    if (!node) return []
    result.push(node.value)
    nextId = node.nextId
  }
  return result
}
