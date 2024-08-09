
export function glEnumToString(gl, value) {
  const keys = [];
  for (const key in gl) {
    if (gl[key] === value) {
      keys.push(key);
    }
  }
  return keys.length ? keys.join(' | ') : `0x${value.toString(16)}`;
}
