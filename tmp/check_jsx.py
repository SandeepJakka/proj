
import sys

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    for i, line in enumerate(lines):
        line_num = i + 1
        # Quick and dirty tag detection
        opens = line.count('<div')
        closes = line.count('</div')
        
        for _ in range(opens):
            stack.append(('div', line_num))
        for _ in range(closes):
            if stack:
                stack.pop()
            else:
                print(f"Extra closing tag at line {line_num}")
        
        # Check condition boundaries too
        if '&& (' in line:
            stack.append(('(', line_num))
        if ')}' in line:
            if stack and stack[-1][0] == '(':
                stack.pop()
            else:
                print(f"Mismatched condition closing at line {line_num}")

    print(f"Remaining stack: {stack}")

if __name__ == "__main__":
    check_jsx_balance(sys.argv[1])
