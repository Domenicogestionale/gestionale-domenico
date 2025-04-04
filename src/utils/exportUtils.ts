// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import * as XLSX from 'xlsx';
// @ts-ignore
import { saveAs } from 'file-saver';
import { Product } from '../types/Product';

// Funzione per esportare i prodotti in formato CSV
export const exportToCSV = (products: Product[]) => {
  // Creare un worksheet
  const worksheet = XLSX.utils.json_to_sheet(
    products.map(product => ({
      'Nome Prodotto': product.name,
      'Codice a Barre': product.barcode,
      'Quantità': product.quantity,
      'Ultimo Aggiornamento': product.updatedAt ? new Date(product.updatedAt).toLocaleString('it-IT') : '-'
    }))
  );

  // Creare un workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

  // Generare il file Excel e scaricarlo
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Nome del file con timestamp
  const fileName = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};

// Funzione per esportare i prodotti in formato PDF
export const exportToPDF = (products: Product[]) => {
  // Creare un nuovo documento PDF
  const doc = new jsPDF('l', 'mm', 'a4');
  
  // Impostazioni documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Report Inventario Prodotti', 14, 20);
  
  // Aggiungere data di generazione
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, 14, 30);
  
  // Intestazioni tabella
  const headers = ['Nome Prodotto', 'Codice a Barre', 'Quantità', 'Ultimo Aggiornamento'];
  
  // Preparare dati per la tabella
  const data = products.map(product => [
    product.name,
    product.barcode,
    product.quantity.toString(),
    product.updatedAt ? new Date(product.updatedAt).toLocaleString('it-IT') : '-'
  ]);
  
  // Calcolare la larghezza delle colonne
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usableWidth = pageWidth - (margin * 2);
  
  // Distribuzione proporzionale delle colonne
  const colWidths = [
    usableWidth * 0.35, // Nome prodotto
    usableWidth * 0.30, // Barcode
    usableWidth * 0.10, // Quantità
    usableWidth * 0.25  // Data aggiornamento
  ];
  
  // Creare la tabella
  let y = 40;
  
  // Disegnare header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, usableWidth, 10, 'F');
  
  let x = margin;
  headers.forEach((header, i) => {
    doc.text(header, x + 2, y + 6);
    x += colWidths[i];
  });
  
  // Disegnare righe della tabella
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  data.forEach((row, rowIndex) => {
    // Alternare colori di sfondo per le righe
    if (rowIndex % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(245, 245, 245);
    }
    doc.rect(margin, y, usableWidth, 8, 'F');
    
    // Aggiungere bordo superiore e laterali
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + usableWidth, y);
    
    // Disegnare celle
    x = margin;
    row.forEach((cell, i) => {
      // Troncare testo lungo
      let textToDisplay = cell;
      if (textToDisplay.length > 30) {
        textToDisplay = textToDisplay.substring(0, 27) + '...';
      }
      
      doc.text(textToDisplay, x + 2, y + 5);
      x += colWidths[i];
    });
    
    y += 8;
    
    // Nuova pagina se necessario
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  });
  
  // Aggiungere bordo inferiore dell'ultima riga
  doc.line(margin, y, margin + usableWidth, y);
  
  // Aggiungere sommario
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text(`Totale prodotti: ${products.length}`, margin, y);
  
  y += 8;
  const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);
  doc.text(`Quantità totale in magazzino: ${totalQuantity}`, margin, y);
  
  // Nome del file con timestamp
  const fileName = `report_inventario_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Funzione per esportare un singolo prodotto in PDF come scheda dettagliata
export const exportProductCard = (product: Product) => {
  // Creare un nuovo documento PDF
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Impostazioni documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Scheda Prodotto', 15, 20);
  
  // Aggiungere bordi e stile alla scheda
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(15, 30, 180, 100, 5, 5, 'FD');
  
  // Informazioni del prodotto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(product.name, 25, 45);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  // Codice a barre
  doc.text('Codice a Barre:', 25, 60);
  doc.setFont('courier', 'bold');
  doc.text(product.barcode, 80, 60);
  
  // Quantità
  doc.setFont('helvetica', 'normal');
  doc.text('Quantità in Magazzino:', 25, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(product.quantity.toString(), 80, 70);
  
  // Data creazione
  doc.setFont('helvetica', 'normal');
  doc.text('Data Creazione:', 25, 80);
  doc.text(product.createdAt ? new Date(product.createdAt).toLocaleString('it-IT') : '-', 80, 80);
  
  // Ultimo aggiornamento
  doc.text('Ultimo Aggiornamento:', 25, 90);
  doc.text(product.updatedAt ? new Date(product.updatedAt).toLocaleString('it-IT') : '-', 80, 90);
  
  // ID interno
  doc.text('ID interno:', 25, 100);
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.text(product.id || '-', 80, 100);
  
  // Aggiungi QR code stilizzato (simulato con un quadrato)
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(150, 40, 35, 35, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.text('QR Code', 160, 60);
  
  // Piè di pagina
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(`Scheda generata il ${new Date().toLocaleString('it-IT')}`, 15, 280);
  
  // Nome del file con nome prodotto e timestamp
  const safeProductName = product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `scheda_${safeProductName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}; 