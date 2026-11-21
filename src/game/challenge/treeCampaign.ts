export type BinarySearchTreeNode = { value: number; left: BinarySearchTreeNode | null; right: BinarySearchTreeNode | null }
export type TreeTraversalOrder = 'preorder' | 'inorder' | 'postorder'

export function insertBstNode(root: BinarySearchTreeNode | null, value: number): BinarySearchTreeNode | null {
  if (!Number.isFinite(value)) return root
  if (!root) return { value, left: null, right: null }
  if (value === root.value) return root
  if (value < root.value) return { ...root, left: insertBstNode(root.left, value) }
  return { ...root, right: insertBstNode(root.right, value) }
}
export function preorderTraversal(root: BinarySearchTreeNode | null): number[] {
  return root ? [root.value, ...preorderTraversal(root.left), ...preorderTraversal(root.right)] : []
}
export function inOrderTraversal(root: BinarySearchTreeNode | null): number[] {
  return root ? [...inOrderTraversal(root.left), root.value, ...inOrderTraversal(root.right)] : []
}
export function postorderTraversal(root: BinarySearchTreeNode | null): number[] {
  return root ? [...postorderTraversal(root.left), ...postorderTraversal(root.right), root.value] : []
}
export function getTreeTraversal(root: BinarySearchTreeNode | null, order: TreeTraversalOrder): number[] {
  if (order === 'preorder') return preorderTraversal(root)
  if (order === 'postorder') return postorderTraversal(root)
  return inOrderTraversal(root)
}
