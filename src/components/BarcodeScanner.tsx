import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

// Variabile globale per lo scanner
let html5QrCode: Html5Qrcode;

interface BarcodeScannerProps {
  onProductScanned: (product: Product | null, barcode: string) => void;
}

const BarcodeScanner = ({ onProductScanned }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isScanCooldown, setIsScanCooldown] = useState(false);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const { getProductByBarcode } = useProductStore();

  useEffect(() => {
    // Pulizia al momento dell'unmount
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(() => console.log('Scanner già fermato'));
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      // Se siamo in cooldown, non avviare lo scanner
      if (isScanCooldown) {
        console.log('Scanner in cooldown, non posso avviare');
        return;
      }

      setErrorMessage('');
      html5QrCode = new Html5Qrcode("reader");
      
      const qrCodeSuccessCallback = async (decodedText: string) => {
        try {
          // Verifica che il testo decodificato sia un barcode valido
          if (!/^\d+$/.test(decodedText)) {
            console.log('Codice non valido, ignoro:', decodedText);
            return;
          }

          // Se siamo in cooldown, ignora la scansione
          if (isScanCooldown) {
            console.log('Scanner in cooldown, ignoro la scansione');
            return;
          }

          // Ferma lo scanner durante il cooldown
          try {
            await html5QrCode.stop();
            setIsScanning(false);
          } catch (stopError) {
            console.error('Errore durante lo stop dello scanner:', stopError);
            setErrorMessage('Errore fermando lo scanner.');
            // Prova comunque a procedere con il cooldown e il riavvio
          }
          
          // Imposta il cooldown di 3 secondi
          setIsScanCooldown(true);
          setRemainingCooldown(3);
          
          const product = await getProductByBarcode(decodedText);
          onProductScanned(product, decodedText);
          
          // Avvia il timer del cooldown
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current);
          }
          
          cooldownRef.current = setInterval(() => {
            setRemainingCooldown(prev => {
              if (prev <= 1) {
                if (cooldownRef.current) {
                  clearInterval(cooldownRef.current);
                  cooldownRef.current = null;
                }
                setIsScanCooldown(false);
                // Riavvia lo scanner dopo il cooldown in modo sicuro
                startScanner().catch(startErr => {
                  console.error('Errore riavviando lo scanner dopo cooldown:', startErr);
                  setErrorMessage('Errore riavviando lo scanner.');
                });
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } catch (error) {
          console.error('Errore durante la ricerca del prodotto:', error);
          setErrorMessage('Errore durante la ricerca del prodotto');
          // In caso di errore, prova a riavviare lo scanner dopo il cooldown
          setTimeout(() => {
            setIsScanCooldown(false);
            startScanner().catch(startErr => {
              console.error('Errore riavviando lo scanner dopo errore:', startErr);
              setErrorMessage('Errore riavviando lo scanner.');
            });
          }, 3000);
        }
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            disableFlip: true
          },
          qrCodeSuccessCallback,
          (errorMessage) => {
            // Non trattare gli errori di scansione comuni come errori bloccanti
            if (!errorMessage.includes('No QR code found')) {
              console.log('Messaggio scanner:', errorMessage);
            }
          }
        );
        setIsScanning(true);
      } catch (startError) {
        console.error('Errore avviando lo scanner:', startError);
        setErrorMessage(`Errore fotocamera: ${startError.message}`);
        setIsScanning(false);
        // Prova a fermare lo scanner se l'avvio fallisce
        if (html5QrCode) {
          stopScanner().catch(stopErr => console.error('Errore fermando dopo avvio fallito:', stopErr));
        }
      }
    } catch (err) {
      // Questo catch gestisce errori nella creazione di Html5Qrcode
      console.error('Errore inizializzazione Html5Qrcode:', err);
      setErrorMessage(`Errore scanner: ${err.message}`);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    console.log('Fermando lo scanner...');
    try {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
        console.log('Cooldown timer fermato.');
      }
      if (html5QrCode) {
        const scannerState = html5QrCode.getState();
        console.log('Stato scanner prima dello stop:', scannerState);
        // Verifica se lo scanner è effettivamente in scansione prima di fermarlo
        if (scannerState === 2 /* SCANNING */) {
          await html5QrCode.stop();
          console.log('Scanner fermato con successo.');
        } else {
          console.log('Scanner non era in stato SCANNING, stop non necessario o già eseguito.');
        }
        html5QrCode = null; // Resetta riferimento solo dopo stop riuscito o se non necessario
      } else {
        console.log('Nessuna istanza di html5QrCode da fermare.');
      }
    } catch (err) {
      console.error('Errore critico fermando lo scanner:', err);
      setErrorMessage('Errore fermando lo scanner');
      // Non resettare isScanning qui, potrebbe essere ancora attivo o bloccato
    } finally {
      // Resetta sempre gli stati locali associati allo scanning
      setIsScanning(false);
      setIsScanCooldown(false);
      setRemainingCooldown(0);
      setErrorMessage(''); // Resetta messaggio errore solo se lo stop va a buon fine o non c'era nulla da fermare?
      console.log('Stati scanner resettati dopo stop/tentativo di stop.');
    }
  };

  return (
    <div className="w-full mb-4">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
        <div className="mb-3">
          <div className="text-blue-800 font-medium">
            Scanner Barcode
          </div>
          
          <p className="text-sm text-gray-600 mt-1">
            {isScanning 
              ? 'Scanner fotocamera attivo. Inquadra un codice a barre.' 
              : 'Clicca su "Avvia Scanner" per attivare la fotocamera.'}
          </p>
        </div>
        
        <div id="reader" className={`w-full ${isScanning ? 'h-64 sm:h-80' : 'h-0'} border rounded-lg mb-3 sm:mb-4 transition-all duration-300 overflow-hidden relative`}>
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[80%] h-[60%] border-4 border-blue-500 rounded-lg relative bg-blue-100 bg-opacity-10">
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
              </div>
            </div>
          )}
        </div>
        
        {errorMessage && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {errorMessage}
          </div>
        )}
        
        <div className="flex justify-center mt-2">
          {!isScanning ? (
            <button
              onClick={startScanner}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded"
            >
              Avvia Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded"
              disabled={isScanCooldown}
            >
              Ferma Scanner
            </button>
          )}
        </div>
        
        {isScanCooldown && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Elaborazione...</span>
              <span>{remainingCooldown}s</span>
            </div>
            <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all" 
                style={{ width: `${(remainingCooldown / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {lastBarcode && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">Ultimo barcode:</span> {lastBarcode}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner; 