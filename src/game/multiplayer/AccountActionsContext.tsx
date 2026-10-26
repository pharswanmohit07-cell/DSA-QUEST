import { createContext, useContext, type ReactNode } from 'react'

export type AccountActions = {
  displayName: string
  isAdmin: boolean
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

/** Returns account actions only when the auth gate is enabled for this app session. */
export function useOptionalAccountActions(): AccountActions | null {
  return useContext(AccountActionsContext)
}

/** Available to components that require an authenticated account. */
export function useAccountActions(): AccountActions {
  const value = useOptionalAccountActions()
  if (!value) {
    throw new Error('useAccountActions must be used inside the authenticated app.')
  }
  return value
}
