export const cloneSdkObject = <T extends object>(value: T): T =>
  Object.assign(Object.create(Object.getPrototypeOf(value)), value)
