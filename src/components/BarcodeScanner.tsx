import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

let html5QrCode: Html5Qrcode;

interface BarcodeScannerProps {
  onProductFound: (product: Product | null, barcode: string) => void;
}

const BarcodeScanner = ({ onProductFound }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVolumeKeyEnabled, setIsVolumeKeyEnabled] = useState(false);
  const [isScanCooldown, setIsScanCooldown] = useState(false);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const { getProductByBarcode } = useProductStore();

  useEffect(() => {
    // Inizializza lo scanner al caricamento del componente
    html5QrCode = new Html5Qrcode("reader");

    // Pulizia al momento dell'unmount
    return () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(() => console.log('Scanner già fermato'));
      }
      
      // Rimuovi event listener per i tasti volume se attivo
      if (isVolumeKeyEnabled) {
        document.removeEventListener('keydown', handleVolumeKeyPress);
      }
    };
  }, []);
  
  // Gestisce pressione tasti volume
  const handleVolumeKeyPress = (event: KeyboardEvent) => {
    // Tasto volume su (24) o volume giù (25)
    if (event.keyCode === 24 || event.keyCode === 25 || event.key === 'AudioVolumeUp' || event.key === 'AudioVolumeDown') {
      event.preventDefault();
      
      if (isScanning) {
        stopScanner();
      } else {
        startScanner();
      }
    }
  };
  
  // Abilita/disabilita controllo tasti volume
  const toggleVolumeKeyControl = () => {
    if (isVolumeKeyEnabled) {
      // Disabilita controllo tasti volume
      document.removeEventListener('keydown', handleVolumeKeyPress);
      setIsVolumeKeyEnabled(false);
    } else {
      // Abilita controllo tasti volume
      document.addEventListener('keydown', handleVolumeKeyPress);
      setIsVolumeKeyEnabled(true);
    }
  };

  const startScanner = () => {
    setErrorMessage('');
    setIsScanning(true);

    const qrCodeSuccessCallback = async (decodedText: string) => {
      // Previene scansioni multiple SOLO durante il cooldown, ma permette di scansionare
      // lo stesso codice più volte dopo il cooldown
      if (isScanCooldown) {
        console.log(`[DEBUG] Scansione ignorata durante il cooldown: ${decodedText}`);
        return;
      }
      
      // Attiva cooldown per prevenire scansioni multiple rapidamente
      setIsScanCooldown(true);
      
      // Aggiorniamo lastBarcode anche se è lo stesso di prima
      // In questo modo permettiamo scansioni ripetute dello stesso codice
      // (la quantità sarà controllata nel componente padre)
      setLastBarcode(decodedText);
      
      // Inizializza il countdown visivo
      setRemainingCooldown(3);
      const countdownInterval = setInterval(() => {
        setRemainingCooldown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      try {
        console.log(`Barcode scansionato: ${decodedText}`);
        // Aggiungo log dettagliati
        console.log(`[DEBUG] Prima di getProductByBarcode, barcode: ${decodedText}`);
        const product = await getProductByBarcode(decodedText);
        console.log(`[DEBUG] Dopo getProductByBarcode, prodotto trovato:`, product);
        
        // Informa il componente padre del prodotto trovato
        if (product) {
          console.log(`[DEBUG] Chiamando onProductFound con:`, product, decodedText);
          onProductFound(product, decodedText);
          console.log(`[DEBUG] onProductFound chiamato con successo`);
        } else {
          console.log(`[DEBUG] Prodotto non trovato per il barcode ${decodedText}`);
          onProductFound(null, decodedText);
        }
        
        // Breve pausa per evitare scansioni multiple ravvicinate
        setTimeout(() => {
          setIsScanCooldown(false);
          console.log('[DEBUG] Cooldown scansione terminato, pronto per nuova scansione');
        }, 3000); // Aumentato a 3 secondi per evitare scansioni accidentali ripetute
      } catch (error) {
        console.error('[DEBUG] Errore durante la ricerca del prodotto:', error);
        setErrorMessage('Errore durante la ricerca del prodotto');
        onProductFound(null, decodedText);
        setTimeout(() => {
          setIsScanCooldown(false);
        }, 1000);
      }
    };

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
      { facingMode: "environment" }, // Usa la fotocamera posteriore se disponibile
      config,
      qrCodeSuccessCallback,
      (errorMessage) => {
        // Non mostrare errori di decodifica all'utente
        console.log(errorMessage);
      }
    ).catch(err => {
      setIsScanning(false);
      setErrorMessage(`Errore fotocamera: ${err.message}`);
    });
  };

  const stopScanner = () => {
    if (html5QrCode && isScanning) {
      html5QrCode.stop().then(() => {
        setIsScanning(false);
      }).catch(() => {
        console.error('Errore fermando lo scanner');
      });
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-md overflow-hidden">
        <div id="reader" className="w-full h-56 sm:h-64 border-2 border-gray-300 rounded-lg mb-3 sm:mb-4"></div>
      </div>
      
      {errorMessage && (
        <div className="text-red-500 mb-3 sm:mb-4 text-sm sm:text-base">{errorMessage}</div>
      )}
      
      <div className="flex flex-wrap justify-center gap-2 mb-3 sm:mb-4">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-3 sm:px-4 rounded text-sm sm:text-base"
          >
            Avvia Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 sm:px-4 rounded text-sm sm:text-base"
            disabled={isScanCooldown}
          >
            Ferma Scanner
          </button>
        )}
        
        <button
          onClick={toggleVolumeKeyControl}
          className={`py-2 px-3 sm:px-4 rounded font-bold text-white text-sm sm:text-base ${
            isVolumeKeyEnabled 
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-gray-500 hover:bg-gray-600'
          }`}
          disabled={isScanCooldown}
        >
          {isVolumeKeyEnabled ? 'Disabilita Tasti Volume' : 'Abilita Tasti Volume'}
        </button>
      </div>
      
      {isVolumeKeyEnabled && (
        <div className="bg-purple-100 border-l-4 border-purple-500 p-2 sm:p-3 mb-3 sm:mb-4 text-xs sm:text-sm text-purple-900 w-full">
          <p>Controllo tasti volume attivo: Premi un tasto volume per avviare/fermare lo scanner.</p>
        </div>
      )}
      
      {isScanCooldown && (
        <div className="w-full max-w-sm mt-1 sm:mt-2 mb-3 sm:mb-4">
          <div className="flex justify-between text-xs sm:text-sm mb-1 text-gray-600">
            <span>Elaborazione...</span>
            <span>{remainingCooldown}s</span>
          </div>
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 cooldown-progress rounded-full"
              style={{ width: `${(remainingCooldown / 3) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 text-center">
            Attendere il completamento prima di scansionare un altro prodotto
          </p>
        </div>
      )}
      
      {lastBarcode && (
        <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-gray-700">
            <span className="font-medium">Ultimo barcode:</span> {lastBarcode}
          </p>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner; 