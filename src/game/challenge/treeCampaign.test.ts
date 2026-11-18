import { describe, expect, it } from 'vitest'
import { getTreeTraversal, inOrderTraversal, insertBstNode, postorderTraversal, preorderTraversal } from './treeCampaign'

describe('Trees campaign mechanics', () => {
  it('inserts values by BST ordering and returns the three core traversals', () => {
    let root = null
    for (const value of [8, 4, 12, 6]) root = insertBstNode(root, value)
    expect(root).toEqual({ value: 8, left: { value: 4, left: null, right: { value: 6, left: null, right: null } }, right: { value: 12, left: null, right: null } })
    expect(preorderTraversal(root)).toEqual([8, 4, 6, 12])
    expect(inOrderTraversal(root)).toEqual([4, 6, 8, 12])
    expect(postorderTraversal(root)).toEqual([6, 4, 12, 8])
    expect(getTreeTraversal(root, 'postorder')).toEqual([6, 4, 12, 8])
  })
  it('does not add duplicates and handles an empty tree', () => {
    let root = insertBstNode(null, 8)
    root = insertBstNode(root, 8)
    expect(inOrderTraversal(root)).toEqual([8])
    expect(inOrderTraversal(null)).toEqual([])
  })
})
