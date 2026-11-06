/* Importación y exportación de gastos de Organizador. */
export function setupExpenseTransfer({ $, R, get, update, push, money }) {
  const exportBtn = $('gastos-export-btn'), importBtn = $('gastos-import-btn'), input = $('gastos-import-file');
  if (!exportBtn || !importBtn || !input) return;
  const encode = data => {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let raw = '';
    for (const byte of bytes) raw += String.fromCharCode(byte);
    return btoa(raw);
  };
  const decode = encoded => {
    const raw = atob(encoded);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(raw, c => c.charCodeAt(0))));
  };
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    try {
      const snap = await get(R('gastos'));
      const entries = Object.values(snap.val() || {}).map(g => ({
        concepto: String(g.concepto || '').trim(), monto: Number(g.monto)
      })).filter(g => g.concepto && Number.isFinite(g.monto));
      if (!entries.length) { alert('No hay gastos para exportar.'); return; }
      if (!window.jspdf?.jsPDF) throw new Error('No se pudo cargar el generador de PDF.');
      const total = entries.reduce((sum, g) => sum + g.monto, 0);
      const period = new Date().toISOString().slice(0, 7);
      const doc = new window.jspdf.jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
      doc.text('Organizador - Registro de gastos', 15, y); y += 11;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      doc.text('Periodo: ' + period, 15, y); y += 7;
      doc.text('Total: ' + money(total), 15, y); y += 12;
      doc.setFontSize(10);
      for (const gasto of entries) {
        const lines = doc.splitTextToSize(gasto.concepto, pageWidth - 85);
        if (y + Math.max(8, lines.length * 5) > 275) { doc.addPage(); y = 20; }
        doc.text(lines, 15, y);
        doc.text('$' + gasto.monto.toFixed(2), pageWidth - 15, y, {align:'right'});
        y += Math.max(8, lines.length * 5 + 3);
      }
      doc.addPage();
      doc.setFont('helvetica','bold'); doc.setFontSize(13);
      doc.text('Datos de restauracion - Organizador',15,20);
      doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.text('Conserva esta pagina para importar los gastos mas adelante.',15,29);
      const payload = encode({format:'organizador-expenses',version:1,period,entries});
      const chunks = payload.match(/.{1,88}/g) || [];
      doc.setFont('courier','normal'); doc.setFontSize(7);
      let row = 40;
      doc.text('ORGDATA-BEGIN',15,row); row += 6;
      for (const chunk of chunks) {
        if (row > 275) { doc.addPage(); row = 18; }
        doc.text(chunk,15,row); row += 4;
      }
      if (row > 275) { doc.addPage(); row = 18; }
      doc.text('ORGDATA-END',15,row);
      // Descargar antes de tocar los datos; el usuario debe confirmar el reinicio.
      doc.save('organizador-gastos-' + period + '.pdf');
      if (!confirm('Se descargó el PDF. ¿Querés reiniciar ahora los gastos y el ingreso a $0? Comprobá primero que el archivo esté guardado.')) return;
      await update(R(''), {gastos:null, ingreso:0});
      alert('Mes reiniciado correctamente.');
    } catch (error) {
      console.error('Exportación de gastos',error);
      alert(error.message || 'No se pudo exportar.');
    } finally { exportBtn.disabled = false; }
  });
  importBtn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    importBtn.disabled = true;
    try {
      if (file.size > 15000000) throw new Error('El PDF es demasiado grande (máximo 15 MB).');
      const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
      const document = await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
      let text = '';
      for (let n = 1; n <= document.numPages; n++) {
        const page = await document.getPage(n);
        const content = await page.getTextContent();
        text += ' ' + content.items.map(i => i.str).join(' ');
      }
      const begin = text.indexOf('ORGDATA-BEGIN'), end = text.indexOf('ORGDATA-END',begin + 13);
      if (begin < 0 || end < 0) throw new Error('Este PDF no es un archivo de gastos exportado por Organizador.');
      const data = decode(text.slice(begin + 'ORGDATA-BEGIN'.length,end).replace(/\s+/g,''));
      if (data.format !== 'organizador-expenses' || data.version !== 1 || !Array.isArray(data.entries)) throw new Error('Formato de gastos no compatible.');
      if (!data.entries.length || data.entries.length > 3000) throw new Error('Cantidad de gastos no válida.');
      const entries = data.entries.map(g => ({concepto:String(g.concepto || '').trim(), monto:Number(g.monto)}));
      if (entries.some(g => !g.concepto || g.concepto.length > 500 || !Number.isFinite(g.monto) || g.monto < 0)) throw new Error('El PDF contiene datos inválidos.');
      if (!confirm('¿Agregar ' + entries.length + ' gastos a tu registro actual? Los gastos existentes se conservarán.')) return;
      const changes = {};
      for (const g of entries) changes[push(R('gastos')).key] = g;
      await update(R('gastos'),changes);
      alert('Se importaron ' + entries.length + ' gastos.');
    } catch(error) {
      console.error('Importación de gastos',error);
      alert(error.message || 'No se pudo importar el PDF.');
    } finally { importBtn.disabled = false; input.value = ''; }
  });
}
