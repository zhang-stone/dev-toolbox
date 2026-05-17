export function formatMarkdown(raw: string): string {
  if (!raw.trim()) return '';

  return raw
    // 标题: # ~ ######
    .replace(/\s+(#{1,6}\s)/g, '\n$1')
    // 有序列表: 1. 2. 3. ...
    .replace(/\s+(\d+\.\s)/g, '\n$1')
    // 无序列表: - item / * item / + item
    .replace(/\s+([-*+]\s(?!\s))/g, '\n$1')
    // 引用块: > text
    .replace(/\s+(>+\s)/g, '\n$1')
    // 分割线: --- / *** / ___（至少3个）
    .replace(/\s+((?:-{3,}|\*{3,}|_{3,})\s*)/g, '\n$1')
    // 代码块围栏: ``` 或 ~~~
    .replace(/\s+((?:```|~~~))/g, '\n$1')
    .trim()
    .split('\n')
    .map(line => line.trimStart())
    .join(' \n');
}
