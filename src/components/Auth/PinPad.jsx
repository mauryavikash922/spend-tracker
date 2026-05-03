import { useState, useEffect } from 'react';
import { hashPin } from '../../utils/crypto';

export function PinPad({ mode = 'unlock', appPin = null, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'enter' : 'unlock'); // 'enter', 'confirm', 'unlock'
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => setError(''), 3000);
  };

  useEffect(() => {
    if (pin.length !== 4) return;

    const process = async () => {
      if (step === 'enter') {
        setConfirmPin(pin);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (pin === confirmPin) {
          const hashed = await hashPin(pin);
          onSuccess(hashed);
        } else {
          triggerError('PINs do not match. Try again.');
          setPin('');
          setConfirmPin('');
          setStep('enter');
        }
      } else if (step === 'unlock') {
        const hashed = await hashPin(pin);
        if (hashed === appPin) {
          onSuccess();
        } else {
          triggerError('Incorrect PIN');
          setPin('');
        }
      }
    };

    process();
  }, [pin, step, confirmPin, appPin, onSuccess]);

  const handleKey = (key) => {
    if (pin.length < 4) {
      setPin(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const title = step === 'enter' ? 'Set new PIN' : step === 'confirm' ? 'Confirm new PIN' : mode === 'remove' ? 'Remove PIN' : 'Enter PIN';
  const desc = step === 'unlock' ? (mode === 'remove' ? 'Enter current PIN to verify' : 'Unlock to access secure data') : 'Protect your sensitive data';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 absolute inset-0 z-50">
      <div className="w-full max-w-sm flex flex-col items-center">
        {onCancel && (
          <button onClick={onCancel} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-200 rounded-full active:scale-95 transition-transform">
            <i className="ri-close-line text-xl" />
          </button>
        )}

        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-lock-2-line text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-500 text-sm mt-1">{desc}</p>
        </div>

        <div className={`flex gap-4 mb-12 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-indigo-600 scale-110' : 'bg-gray-300'}`} />
          ))}
        </div>

        <div className="h-6 mb-4">
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKey(num.toString())}
              className="w-16 h-16 flex items-center justify-center text-2xl font-medium text-gray-800 rounded-full bg-white shadow-sm active:bg-gray-100 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKey('0')}
            className="w-16 h-16 flex items-center justify-center text-2xl font-medium text-gray-800 rounded-full bg-white shadow-sm active:bg-gray-100 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 flex items-center justify-center text-2xl text-gray-600 rounded-full active:bg-gray-200 active:scale-95 transition-all"
          >
            <i className="ri-delete-back-2-line" />
          </button>
        </div>
      </div>
    </div>
  );
}
