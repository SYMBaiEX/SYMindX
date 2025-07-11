import re

# Read the file
with open('/home/cid/CursorProjects/symindx/mind-agents/src/extensions/telegram/index.ts', 'r') as f:
    content = f.read()

# Replace all instances
content = re.sub(r'result as GenericData', 'result as unknown as GenericData', content)

# Write back to file
with open('/home/cid/CursorProjects/symindx/mind-agents/src/extensions/telegram/index.ts', 'w') as f:
    f.write(content)

print('Replacement completed')