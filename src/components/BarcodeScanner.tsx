import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

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
  const [volumeButtonsEnabled, setVolumeButtonsEnabled] = useState(false);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Costanti per il cooldown
  const COOLDOWN_DURATION = 3000; // 3 secondi
  const PROGRESS_INTERVAL = 50; // Aggiorna la barra di progresso ogni 50ms

  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("scanner-container");
      }

      const config = {
        fps: 15, // Aumentato per una scansione più fluida
        qrbox: {
          width: 200,
          height: 100,
        },
        aspectRatio: 1.7777778, // 16:9
        formatsToSupport: ['ean-13', 'ean-8'], // Formati supportati per codici a barre
      };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignora gli errori di decodifica che sono normali durante la scansione
          if (!errorMessage.includes("No barcode")) {
            console.log(errorMessage);
          }
        }
      );

      setScanning(true);
      setError(null);
    } catch (err) {
      console.error('Errore avvio scanner:', err);
      setError('Errore fotocamera: ' + (err as Error).message);
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        setScanning(false);
      }
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

  const handleVolumeButton = useCallback((event: KeyboardEvent) => {
    if (!volumeButtonsEnabled || isProcessing) return;

    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;

    if (timeSinceLastScan >= COOLDOWN_DURATION) {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        handleScanSuccess('VOLUME_BUTTON_' + Date.now());
      }
    }
  }, [volumeButtonsEnabled, isProcessing, lastScanTime]);

  useEffect(() => {
    if (volumeButtonsEnabled) {
      window.addEventListener('keydown', handleVolumeButton);
    }
    
    return () => {
      window.removeEventListener('keydown', handleVolumeButton);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      stopScanner();
    };
  }, [handleVolumeButton, volumeButtonsEnabled]);

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

        <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
          <button
            onClick={() => scanning ? stopScanner() : startScanner()}
            disabled={cooldownProgress > 0 || isProcessing}
            className={`px-4 py-2 rounded-lg font-bold text-white ${
              cooldownProgress > 0 || isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {scanning ? 'Stop Scanner' : 'Avvia Scanner'}
          </button>

          <button
            onClick={() => setVolumeButtonsEnabled(!volumeButtonsEnabled)}
            className={`px-4 py-2 rounded-lg font-bold ${
              volumeButtonsEnabled
                ? 'bg-gray-700 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Abilita Tasti Volume
          </button>
        </div>

        <div className="relative">
          <div 
            id="scanner-container" 
            className="w-full h-[300px] bg-black rounded-lg overflow-hidden"
          />
          {scanning && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-[200px] h-[100px] border-2 border-blue-500 rounded-lg">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500" />
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-2 p-2 bg-red-50 text-red-600 rounded text-sm">
            {error}
          </div>
        )}
        
        {lastScannedBarcode && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm font-mono">
            {lastScannedBarcode}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner; 