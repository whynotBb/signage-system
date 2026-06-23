// TODO: 커맨드 팔레트 UI 구현 시 useUIStore를 연결하세요
// 예: Cmd+K 단축키로 toggleCommand() 호출, isCommandOpen 으로 <CommandDialog> 표시
import { create } from 'zustand'

interface UIStore {
  isCommandOpen: boolean
  setCommandOpen: (open: boolean) => void
  toggleCommand: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  isCommandOpen: false,
  setCommandOpen: (open) => set({ isCommandOpen: open }),
  toggleCommand: () => set((state) => ({ isCommandOpen: !state.isCommandOpen })),
}))
