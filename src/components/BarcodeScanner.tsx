import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

interface BarcodeScannerProps {
  onProductFound: (barcode: string) => void;
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const { getProductByBarcode } = useProductStore();

  // Costanti per il cooldown
  const COOLDOWN_DURATION = 3000; // 3 secondi
  const PROGRESS_INTERVAL = 50; // Aggiorna la barra di progresso ogni 50ms

  const startScanner = async () => {
    try {
      if (!scannerContainerRef.current) return;

      const scanner = new Html5Qrcode("scanner-container");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          console.error('Errore scansione:', errorMessage);
        }
      );

      setScanning(true);
      setError(null);
    } catch (err) {
      console.error('Errore avvio scanner:', err);
      setError('Impossibile avviare lo scanner. Verifica i permessi della fotocamera.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setScanning(false);
    } catch (err) {
      console.error('Errore stop scanner:', err);
    }
  };

  const handleScanSuccess = (barcode: string) => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;

    if (timeSinceLastScan >= COOLDOWN_DURATION) {
      console.log('Barcode scansionato:', barcode);
      onProductFound(barcode);
      setLastScanTime(now);
      setLastScannedBarcode(barcode);
      
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
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

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
        
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={() => scanning ? stopScanner() : startScanner()}
            disabled={cooldownProgress > 0 || isProcessing}
            className={`px-4 py-2 rounded-lg font-bold text-white ${
              scanning || cooldownProgress > 0 || isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {scanning ? 'Stop Scanner' : 'Avvia Scanner'}
          </button>
          
          <p className="text-xs text-gray-500">
            {scanning 
              ? 'Posiziona il codice a barre davanti alla fotocamera...' 
              : cooldownProgress > 0
                ? 'Attendi prima della prossima scansione...'
                : 'Clicca su Avvia Scanner per iniziare'}
          </p>
        </div>

        <div 
          id="scanner-container"
          ref={scannerContainerRef}
          className={`mt-4 w-full aspect-square rounded-lg overflow-hidden ${
            scanning ? 'block' : 'hidden'
          }`}
        />
        
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