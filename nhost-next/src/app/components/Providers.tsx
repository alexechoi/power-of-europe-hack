'use client'

import { NhostProvider } from '@nhost/nextjs'
import { nhost } from '../../lib/nhost'
import { AuthWrapper } from './AuthWrapper'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NhostProvider nhost={nhost}>
      <AuthWrapper>
        {children}
      </AuthWrapper>
    </NhostProvider>
  )
}
