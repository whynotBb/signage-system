'use client'

import dynamic from 'next/dynamic'
import { Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const ThemeToggle = dynamic(
  () => import('./theme-toggle-impl').then((m) => m.ThemeToggleImpl),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" size="icon" aria-label="테마 전환">
        <Monitor className="h-4 w-4" />
      </Button>
    ),
  }
)
