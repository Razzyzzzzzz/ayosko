// Minimal PDF writer: one JPEG per page, scaled to fit A4 (landscape if the picture is wide). No dependencies.
export function jpegsToPdf(pages) {
  const enc = new TextEncoder(); const chunks = []; let offset = 0; const xref = [];
  const push = (d) => { const u = typeof d === 'string' ? enc.encode(d) : d; chunks.push(u); offset += u.length; };
  const obj = (n, body) => { xref[n] = offset; push(`${n} 0 obj\n${body}\nendobj\n`); };
  const n = pages.length;
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] >>`);
  pages.forEach((p, i) => {
    const land = p.width > p.height; const W = land ? 842 : 595, H = land ? 595 : 842;
    const s = Math.min(W / p.width, H / p.height); const w = +(p.width * s).toFixed(2), h = +(p.height * s).toFixed(2);
    const x = +((W - w) / 2).toFixed(2), y = +((H - h) / 2).toFixed(2); const content = `q ${w} 0 0 ${h} ${x} ${y} cm /Im0 Do Q`;
    obj(3 + 3 * i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${5 + 3 * i} 0 R >> >> /Contents ${4 + 3 * i} 0 R >>`);
    obj(4 + 3 * i, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    xref[5 + 3 * i] = offset;
    push(`${5 + 3 * i} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
    push(p.bytes); push('\nendstream\nendobj\n');
  });
  const total = 3 + 3 * n, start = offset;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += `${String(xref[i]).padStart(10, '0')} 00000 n \n`;
  push(`${x}trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);
  const out = new Uint8Array(offset); let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}