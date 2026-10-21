import { createContext, useContext, type ReactNode } from 'react'

export type AccountActions = {
  displayName: string
  isLoggingOut: boolean
  logout: () => Promise<void>
}

const AccountActionsContext = createContext<AccountActions | null>(null)

export function AccountActionsProvider({
  value,
  children,
}: {
  value: AccountActions
  children: ReactNode
}) {
  return (
    <AccountActionsContext.Provider value={value}>
      {children}
    </AccountActionsContext.Provider>
  )
}

/** Available to account-aware settings screens inside the authenticated app. */
export function useAccountActions(): AccountActions {
  const value = useContext(AccountActionsContext)
  if (!value) {
    throw new Error('useAccountActions must be used inside the authenticated app.')
  }
  return value
}
