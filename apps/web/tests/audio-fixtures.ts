export function toneWav() {
  const rate = 16000,
    length = rate * 3,
    b = Buffer.alloc(44 + length * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * 2 * Math.PI * 880) * 12000),
      44 + i * 2,
    );
  return b;
}
