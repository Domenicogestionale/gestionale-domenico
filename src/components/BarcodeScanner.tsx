import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

let html5QrCode: Html5Qrcode;

interface BarcodeScannerProps {
  onProductFound: (product: Product | null, barcode: string) => void;
  isProcessing: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onProductFound, isProcessing }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const { getProductByBarcode } = useProductStore();

  // Costanti per il cooldown
  const COOLDOWN_DURATION = 3000; // 3 secondi
  const PROGRESS_INTERVAL = 50; // Aggiorna la barra di progresso ogni 50ms

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Ignora se siamo in cooldown o in processing
    if (isProcessing) return;

    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;

    // Se è passato abbastanza tempo dal'ultima scansione
    if (timeSinceLastScan >= COOLDOWN_DURATION) {
      setScanning(true);
      setError(null);
    }
  }, [isProcessing, lastScanTime]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!scanning || isProcessing) return;

    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;

    // Se è passato abbastanza tempo dal'ultima scansione
    if (timeSinceLastScan >= COOLDOWN_DURATION) {
      const barcode = event.key;
      
      // Se il tasto premuto è Enter, processa il barcode
      if (barcode === 'Enter') {
        if (lastScannedBarcode) {
          console.log('Barcode scansionato:', lastScannedBarcode);
          onProductFound(lastScannedBarcode);
          setLastScanTime(now);
          setLastScannedBarcode(null);
          setScanning(false);
          
          // Avvia il cooldown
          setCooldownProgress(100);
          if (cooldownRef.current) clearTimeout(cooldownRef.current);
          if (progressRef.current) clearInterval(progressRef.current);
          
          cooldownRef.current = setTimeout(() => {
            setCooldownProgress(0);
          }, COOLDOWN_DURATION);
          
          progressRef.current = setInterval(() => {
            setCooldownProgress(prev => Math.max(0, prev - (100 / (COOLDOWN_DURATION / PROGRESS_INTERVAL))));
          }, PROGRESS_INTERVAL);
        }
      } else {
        // Aggiungi il carattere al barcode
        setLastScannedBarcode(prev => (prev || '') + barcode);
      }
    }
  }, [scanning, isProcessing, lastScannedBarcode, lastScanTime, onProductFound]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyUp);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [handleKeyPress, handleKeyUp]);

  return (
    <div className="relative">
      <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
        scanning 
          ? 'border-blue-500 bg-blue-50' 
          : cooldownProgress > 0 
            ? 'border-gray-300 bg-gray-50' 
            : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">
            {scanning ? 'Scansione in corso...' : 'Pronto per la scansione'}
          </h3>
          {cooldownProgress > 0 && (
            <span className="text-xs text-gray-500">
              {Math.ceil((cooldownProgress / 100) * (COOLDOWN_DURATION / 1000))}s
            </span>
          )}
        </div>
        
        {cooldownProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-100"
              style={{ width: `${cooldownProgress}%` }}
            />
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          {scanning 
            ? 'Posiziona il codice a barre davanti allo scanner...' 
            : cooldownProgress > 0
              ? 'Attendi prima della prossima scansione...'
              : 'Premi un tasto per iniziare la scansione'}
        </p>
        
        {lastScannedBarcode && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm font-mono">
            {lastScannedBarcode}
          </div>
        )}
        
        {error && (
          <div className="mt-2 p-2 bg-red-50 text-red-600 rounded text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner; 