import { money, fechaTexto, cuando, detLines } from "../utils/format.js";

export function generarPDF(ingreso) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado corporativo
  doc.setFillColor(42, 33, 25); // Marrón oscuro
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('inter', 'bold');
  doc.text('ORGANIZADOR PERSONAL - REPORTE GENERAL', 14, 17);
  
  doc.setFontSize(10);
  doc.setTextColor(143, 152, 168);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 14, 17, { align: 'right' });
  
  let currentY = 36;
  
  // 1. Resumen de Gastos
  doc.setTextColor(42, 33, 25);
  doc.setFontSize(13);
  doc.setFont('inter', 'bold');
  doc.text('1. Resumen Financiero y Gastos', 14, currentY);
  currentY += 6;
  
  const totalGastosNum = Object.values(window._gastosData || {}).reduce((s, g) => s + parseFloat(g.monto || 0), 0);
  const gastosRows = Object.values(window._gastosData || {}).map(g => [g.concepto || '', money(g.monto)]);
  
  doc.autoTable({
    startY: currentY,
    head: [['Concepto de Gasto', 'Monto']],
    body: gastosRows.length ? gastosRows : [['Sin gastos registrados', '$0']],
    theme: 'striped',
    headStyles: { fillColor: [200, 88, 45] },
    foot: ingreso ? [['Ingreso', money(ingreso)], ['Total Acumulado', money(totalGastosNum)], ['Te queda', (ingreso - totalGastosNum < 0 ? '-' : '') + money(Math.abs(ingreso - totalGastosNum))]] : [['Total Acumulado', money(totalGastosNum)]],
    footStyles: { fillColor: [27, 36, 30], textColor: [255, 255, 255], fontStyle: 'bold' }
  });
  
  currentY = doc.lastAutoTable.finalY + 12;
  
  // 2. Fechas Importantes
  doc.setTextColor(42, 33, 25);
  doc.setFontSize(13);
  doc.setFont('inter', 'bold');
  doc.text('2. Fechas Importantes', 14, currentY);
  currentY += 6;
  
  const parcialesRows = (window._parcialesData || []).map(p => [(p.materia || '') + (p.descripcion ? '\n' + p.descripcion : ''), fechaTexto(p.fecha), cuando(p.fecha)]);
  doc.autoTable({
    startY: currentY,
    head: [['Evento / Materia', 'Fecha', 'Estado']],
    body: parcialesRows.length ? parcialesRows : [['Sin fechas importantes registradas', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [63, 143, 166] }
  });
  
  currentY = doc.lastAutoTable.finalY + 12;
  
  // 3. Recordatorios
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  doc.setTextColor(42, 33, 25);
  doc.setFontSize(13);
  doc.setFont('inter', 'bold');
  doc.text('3. Recordatorios Pendientes', 14, currentY);
  currentY += 6;
  
  const recRows = Object.values(window._recData || {}).map(r => [r.tituloOpcional || 'General', detLines(r.detalle || r.titulo || '').map((x, _, a) => a.length > 1 ? '• ' + x : x).join('\n')]);
  doc.autoTable({
    startY: currentY,
    head: [['Título', 'Detalle']],
    body: recRows.length ? recRows : [['Sin recordatorios', '-']],
    theme: 'striped',
    headStyles: { fillColor: [224, 164, 58] }
  });
  
  // Pie de página en todas las páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(143, 152, 168);
    doc.text(`Página ${i} de ${pageCount} — Organizador Personal`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
  
  doc.save('organizador-personal-reporte.pdf');
}

