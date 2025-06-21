import { ValidationResult } from '../../../../extensions/mcp-client/types';

/**
 * Validates code against common security and syntax rules
 */
export function validateCode(
  code: string, 
  language: string = 'javascript',
  options: {
    maxLength?: number,
    allowDynamicImports?: boolean,
    allowEval?: boolean,
    allowedImports?: string[],
    blockedImports?: string[]
  } = {}
): ValidationResult {
  const errors: Array<{ message: string; line: number; column: number }> = [];
  
  // Check max length
  if (options.maxLength !== undefined && code.length > options.maxLength) {
    errors.push({
      message: `Code exceeds maximum length of ${options.maxLength} characters`,
      line: 0,
      column: 0
    });
  }
  
  // Language-specific validations
  if (language === 'javascript' || language === 'typescript') {
    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /\beval\s*\(/, message: 'Use of eval() is not allowed' },
      { pattern: /new\s+Function\s*\(/, message: 'Dynamic code generation is not allowed' },
      { pattern: /require\s*\([^)]*\$\{.*\}/, message: 'Dynamic require() calls are not allowed' }
    ];
    
    if (!options.allowDynamicImports) {
      dangerousPatterns.push(
        { pattern: /import\s*\(/, message: 'Dynamic imports are not allowed' }
      );
    }
    
    // Check for blocked patterns
    dangerousPatterns.forEach(({ pattern, message }) => {
      const match = pattern.exec(code);
      if (match) {
        const lines = code.substr(0, match.index).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        errors.push({ message, line, column });
      }
    });
    
    // Check imports if specified
    if (options.allowedImports || options.blockedImports) {
      const importRegex = /(?:import|require)\s*(?:\(|['"`])([^'"`)]+)(?:['"`]\)?|\/\*[\s\S]*?\*\/)?/g;
      let match;
      
      while ((match = importRegex.exec(code)) !== null) {
        const importPath = match[1].trim();
        const line = code.substr(0, match.index).split('\n').length;
        const column = match.index - code.lastIndexOf('\n', match.index);
        
        // Check against blocked imports
        if (options.blockedImports?.some(blocked => 
          importPath === blocked || importPath.startsWith(blocked + '/'))
        ) {
          errors.push({
            message: `Import of '${importPath}' is not allowed`,
            line,
            column
          });
        }
        
        // Check against allowed imports if specified
        if (options.allowedImports?.length && !options.allowedImports.some(allowed => 
          importPath === allowed || importPath.startsWith(allowed + '/'))
        ) {
          errors.push({
            message: `Import of '${importPath}' is not in the allowed list`,
            line,
            column
          });
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates command-line arguments against a whitelist/blacklist
 */
export function validateCommandArgs(
  command: string,
  args: string[],
  options: {
    allowedCommands?: string[],
    blockedCommands?: string[],
    allowedArgs?: Record<string, string[]>,
    blockedArgs?: Record<string, string[]>
  } = {}
): ValidationResult {
  const errors: Array<{ message: string; line: number; column: number }> = [];
  
  // Check blocked commands
  const fullCommand = [command, ...args].join(' ').toLowerCase();
  
  if (options.blockedCommands?.some(blocked => 
    fullCommand.includes(blocked.toLowerCase())
  )) {
    errors.push({
      message: `Command '${fullCommand}' is blocked by security policy`,
      line: 0,
      column: 0
    });
  }
  
  // Check allowed commands if specified
  if (options.allowedCommands?.length && !options.allowedCommands.some(allowed => 
    command.toLowerCase() === allowed.toLowerCase()
  )) {
    errors.push({
      message: `Command '${command}' is not in the allowed commands list`,
      line: 0,
      column: 0
    });
  }
  
  // Check allowed/blocked arguments
  if (options.allowedArgs || options.blockedArgs) {
    const commandName = command.split('/').pop() || command;
    
    // Check blocked arguments
    const blockedForCommand = options.blockedArgs?.[commandName] || [];
    blockedForCommand.forEach(blockedArg => {
      if (args.includes(blockedArg)) {
        errors.push({
          message: `Argument '${blockedArg}' is not allowed for command '${commandName}'`,
          line: 0,
          column: 0
        });
      }
    });
    
    // Check allowed arguments if specified
    const allowedForCommand = options.allowedArgs?.[commandName];
    if (allowedForCommand?.length) {
      args.forEach(arg => {
        if (arg.startsWith('-') && !allowedForCommand.includes(arg)) {
          errors.push({
            message: `Argument '${arg}' is not in the allowed list for command '${commandName}'`,
            line: 0,
            column: 0
          });
        }
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
