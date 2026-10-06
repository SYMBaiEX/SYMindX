export function terminalColor(stream: { readonly isTTY?: boolean }): boolean {
  return stream.isTTY === true && process.env['NO_COLOR'] === undefined;
}
