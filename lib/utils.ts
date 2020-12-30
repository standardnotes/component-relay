import { Environment } from '@standardnotes/snjs'
import { v4 as uuidv4 } from 'uuid'

declare global {
  interface Window { msCrypto: unknown; }
}

export const generateUuid = () => {
  return uuidv4()
}

export const isValidJsonString = (str: any) => {
  if (typeof str !== 'string') {
    return false
  }
  try {
    const result = JSON.parse(str)
    const type = Object.prototype.toString.call(result)
    return type === '[object Object]' || type === '[object Array]'
  } catch (e) {
    return false
  }
}

export const environmentToString = (environment: Environment) => {
  const map = {
    [Environment.Web]: 'web',
    [Environment.Desktop]: 'desktop',
    [Environment.Mobile]: 'mobile',
  }
  return map[environment] ?? map[Environment.Web]
}
