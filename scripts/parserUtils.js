import fs from 'fs';

// Helper to parse left page lines: "ID Name Department"
// and right page lines: "Date Position [done]"
export function parseLeftLine(line) {
  line = line.trim();
  if (!line || line.startsWith('Employee No.')) return null;
  // Match ID (e.g., P00005, PN0161, T00002, TN0035, PG0013, PI0001, PE0002, TB0004, etc.)
  const match = line.match(/^([A-Z0-9]+)\s+(.+)\s+([A-Za-z0-9\s\(\)\-\&]+)$/);
  if (match) {
    return {
      employeeNo: match[1].trim(),
      name: match[2].trim(),
      department: match[3].trim()
    };
  }
  // Fallback: split by first space and last known department tokens
  const firstSpace = line.indexOf(' ');
  if (firstSpace !== -1) {
    const id = line.substring(0, firstSpace).trim();
    const rest = line.substring(firstSpace).trim();
    return {
      employeeNo: id,
      name: rest,
      department: ''
    };
  }
  return null;
}

export function parseRightLine(line) {
  line = line.trim();
  if (!line || line.startsWith('On-Board Date')) return null;
  const isDone = /\bdone\b/i.test(line);
  const cleanLine = line.replace(/\bdone\b/i, '').trim();
  const match = cleanLine.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  if (match) {
    return {
      onBoardDate: match[1].trim(),
      position: match[2].trim(),
      done: isDone
    };
  }
  return {
    onBoardDate: '',
    position: cleanLine,
    done: isDone
  };
}
