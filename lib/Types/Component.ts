import { ComponentData } from './ComponentData'

export type Component = {
  uuid?: string
  origin?: string
  data?: ComponentData
  sessionKey?: string
  environment?: string
  platform?: string
  isMobile?: boolean
  /** Whether the host scrolls to the end on its shortcut, which older hosts and some users don't */
  hostHandlesScrollToEndShortcut?: boolean
  acceptsThemes: boolean
  activeThemes: string[]
}
