import type { MessageData, UuidString, ComponentAction } from '@standardnotes/snjs'
import { MessagePayloadApi } from './MessagePayloadApi'
import { ComponentData } from './ComponentData'

export type MessagePayload = {
  action: ComponentAction
  data: MessageData
  componentData?: ComponentData
  messageId?: UuidString
  sessionKey?: UuidString
  api: MessagePayloadApi
  original?: MessagePayload
  callback?: (...params: any) => void
}
