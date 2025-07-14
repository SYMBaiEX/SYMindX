import figlet from 'figlet';
import gradient from 'gradient-string';

// ASCII Art configurations
export const ASCII_FONTS = {
  main: 'ANSI Shadow',
  secondary: 'Small',
  compact: 'Mini',
  digital: 'Digital',
  isometric: 'Isometric1',
  cyber: 'Cyberlarge',
};

// Gradient presets
export const GRADIENTS: Record<string, ReturnType<typeof gradient>> = {
  cyberpunk: gradient(['#00F5FF', '#FF00FF', '#FFFF00']),
  neon: gradient(['#FF006E', '#8338EC', '#3A86FF']),
  matrix: gradient(['#00FF00', '#00AA00', '#005500']),
  fire: gradient(['#FF6B6B', '#FFA500', '#FFD700']),
  ice: gradient(['#00F5FF', '#00BFFF', '#87CEEB']),
  synthwave: gradient(['#FF71CE', '#B967FF', '#01CDFE']),
  vaporwave: gradient(['#FF6AD5', '#C774E8', '#AD8CFF']),
};

// Generate ASCII text with gradient
export async function generateAsciiText(
  text: string,
  font: keyof typeof ASCII_FONTS = 'main',
  gradientType: keyof typeof GRADIENTS = 'cyberpunk'
): Promise<string> {
  return new Promise((resolve, reject) => {
    figlet(text, { font: ASCII_FONTS[font] as any }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const coloredText = GRADIENTS[gradientType]?.(data ?? '') ?? data ?? '';
      resolve(coloredText);
    });
  });
}

// Generate box with ASCII art
export function createAsciiBox(content: string, width: number = 60): string {
  const lines = content.split('\n');
  const maxLength = Math.max(...lines.map((line) => line.length), width - 4);
  const boxWidth = maxLength + 4;

  const top = `╔${'═'.repeat(boxWidth - 2)}╗`;
  const bottom = `╚${'═'.repeat(boxWidth - 2)}╝`;

  const paddedLines = lines.map((line) => {
    const padding = boxWidth - line.length - 4;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return `║ ${' '.repeat(leftPad)}${line}${' '.repeat(rightPad)} ║`;
  });

  return [top, ...paddedLines, bottom].join('\n');
}

// Create 3D-style box
export function create3DBox(content: string, depth: number = 3): string[] {
  const lines = content.split('\n');
  const maxLength = Math.max(...lines.map((line) => line.length));
  const boxWidth = maxLength + 4;

  const result: string[] = [];

  // Top face
  result.push(' '.repeat(depth) + '╔' + '═'.repeat(boxWidth - 2) + '╗');

  // Add depth lines for top
  for (let i = depth - 1; i > 0; i--) {
    result.push(' '.repeat(i) + '╱' + ' '.repeat(boxWidth - 2) + '╱');
  }

  // Content lines
  lines.forEach((line, index) => {
    const padding = boxWidth - line.length - 4;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    const paddedLine = `║ ${' '.repeat(leftPad)}${line}${' '.repeat(rightPad)} ║`;

    if (index === 0) {
      result.push(paddedLine + '╱');
    } else {
      result.push(paddedLine + '│');
    }
  });

  // Bottom
  result.push(`╚${'═'.repeat(boxWidth - 2)}╝│`);

  // Bottom depth
  for (let i = 1; i < depth; i++) {
    result.push(' '.repeat(i) + '╲' + '_'.repeat(boxWidth - 2) + '╱');
  }

  return result;
}

// Generate matrix rain characters
export function generateMatrixRain(width: number, height: number): string[][] {
  const chars = '⌂⌀⌁⌃⌄⌅⌆⌇⌈⌉⌊⌋⌌⌍⌎⌏⌐⌑⌒⌓⌔⌕⌖⌗⌘⌙⌚⌛⌜⌝⌞⌟⌠⌡⌢⌣⌤⌥⌦⌧⌨〈〉⌫⌬';
  const matrix: string[][] = [];

  for (let y = 0; y < height; y++) {
    matrix[y] = [];
    for (let x = 0; x < width; x++) {
      matrix[y]![x] =
        Math.random() > 0.8
          ? (chars[Math.floor(Math.random() * chars.length)] ?? ' ')
          : ' ';
    }
  }

  return matrix;
}

// Create glitch effect for text
export function glitchText(text: string, intensity: number = 0.3): string {
  const glitchChars = '▓▒░█▄▀■□▢▣▤▥▦▧▨▩▪▫';
  let result = '';

  for (const char of text) {
    if (Math.random() < intensity) {
      result += glitchChars[Math.floor(Math.random() * glitchChars.length)];
    } else {
      result += char;
    }
  }

  return result;
}

// Create loading animation frames
export function createLoadingFrames(): string[] {
  return ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
}

// Create progress bar
export function createProgressBar(
  progress: number,
  width: number = 30,
  showPercentage: boolean = true
): string {
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;

  const bar = `█`.repeat(filled) + `░`.repeat(empty);
  const percentage = showPercentage ? ` ${progress}%` : '';

  return `[${bar}]${percentage}`;
}

// Create cyberpunk-style header
export async function createCyberpunkHeader(): Promise<string> {
  const title = await generateAsciiText('SYMINDX', 'main', 'cyberpunk');
  const subtitle = 'NEURAL RUNTIME SYSTEM v2.0';
  const status = createProgressBar(100, 40, false) + ' ACTIVE';

  return [
    title,
    '',
    `${' '.repeat(15)}${GRADIENTS.neon?.(subtitle) ?? subtitle}`,
    `${' '.repeat(10)}[SYSTEM STATUS] ${GRADIENTS.synthwave?.(status) ?? status}`,
  ].join('\n');
}
