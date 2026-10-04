/** Keep backend credentials out of command environments and displayed tool output. */
export function childEnvironment(): NodeJS.ProcessEnv {
  const names = new Set([
    'PATH',
    'Path',
    'HOME',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'TEMP',
    'TMP',
    'SystemRoot',
    'SYSTEMROOT',
    'WINDIR',
    'windir',
    'COMSPEC',
    'ComSpec',
    'PATHEXT',
    'TERM',
    'COLORTERM',
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'CI',
    'CODEX_HOME',
    'CARGO_HOME',
    'RUSTUP_HOME',
    'NVM_DIR',
    'BUN_INSTALL',
    'XDG_CONFIG_HOME',
    'XDG_DATA_HOME',
    'XDG_CACHE_HOME',
  ]);
  const result: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (names.has(name) && value !== undefined) result[name] = value;
  }
  return result;
}

export function redactOutput(text: string, extraSecretEnvNames: string[] = []): string {
  let result = text;
  for (const [name, value] of Object.entries(process.env)) {
    if (
      value &&
      value.length >= 8 &&
      (/(?:API_KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(name) ||
        extraSecretEnvNames.includes(name))
    )
      result = result.split(value).join('[redacted]');
  }
  return result.replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g, '[redacted]');
}

export function displayText(text: string): string {
  return redactOutput(text)
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}
