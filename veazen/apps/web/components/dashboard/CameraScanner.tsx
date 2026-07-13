'use client';

import { useEffect, useRef, useState } from 'react';

/** Minimal surface of the native BarcodeDetector we rely on. */
interface DetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): DetectorLike;
}

/**
 * E1 returns-desk camera scanner (PD-004): rear camera via getUserMedia, QR
 * decoding through the native BarcodeDetector where the browser has one,
 * otherwise a dynamically imported jsQR frame loop. Every failure mode
 * (no camera, permission denied, insecure context) surfaces as a readable
 * message and the caller falls back to manual input.
 */
export default function CameraScanner({
  onDetect,
  onClose,
}: {
  onDetect: (text: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is not available in this browser — type the serial instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        setError('Camera unavailable or permission denied — type the serial instead.');
        return;
      }
      const video = videoRef.current;
      if (!video || cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      const finish = (text: string) => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        onDetect(text);
      };

      const Detector = (window as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (Detector) {
        const detector = new Detector({ formats: ['qr_code'] });
        timer = setInterval(() => {
          if (cancelled || video.readyState < 2) {
            return;
          }
          void detector
            .detect(video)
            .then((codes) => {
              if (!cancelled && codes[0]?.rawValue) {
                finish(codes[0].rawValue);
              }
            })
            .catch(() => undefined);
        }, 200);
        return;
      }

      // fallback: decode frames with jsQR on a scratch canvas
      const { default: jsQR } = await import('jsqr');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setError('This browser cannot decode QR codes — type the serial instead.');
        return;
      }
      timer = setInterval(() => {
        if (cancelled || video.readyState < 2 || video.videoWidth === 0) {
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(image.data, image.width, image.height);
        if (result?.data) {
          finish(result.data);
        }
      }, 250);
    }

    void start();
    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-basalt/80 p-6">
      <div
        data-testid="camera-scanner"
        className="w-full max-w-md rounded-lg border border-etch bg-basalt-deep p-5"
      >
        <h2 className="font-display text-lg">Scan a code</h2>
        {error ? (
          <p data-testid="camera-scanner-error" className="mt-3 text-sm text-state-warn">
            {error}
          </p>
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- live camera preview */}
            <video ref={videoRef} playsInline muted className="mt-3 w-full rounded bg-basalt" />
            <p className="mt-2 text-xs text-limestone-dim">
              Point the rear camera at the QR code — the serial fills in automatically.
            </p>
          </>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            data-testid="camera-scanner-close"
            className="rounded border border-etch px-3 py-1.5 text-xs hover:border-jade hover:text-jade"
          >
            {error ? 'Type it instead' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
