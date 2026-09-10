export const isMingalarbar = (text: string) =>
  text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim() === 'မင်္ဂလာပါ'
