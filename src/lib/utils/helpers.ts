export const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomItem = <T>(arr: T[]): T =>
  arr[randomInt(0, arr.length - 1)];

export const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const truncate = (str: string, n: number) =>
  str.length > n ? str.slice(0, n - 3) + '…' : str;

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
