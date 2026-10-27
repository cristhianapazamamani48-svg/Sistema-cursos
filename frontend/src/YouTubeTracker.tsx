import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from './api';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeTrackerProps {
  videoId: string; // ej. 'dQw4w9WgXcQ'
  lessonId: number;
  minWatchPercentage?: number;
  onProgressUpdate?: (stats: {
    watchedBlocksCount: number;
    totalBlocks: number;
    currentWatchPercentage: number;
    isCompleted: boolean;
  }) => void;
}

export default function YouTubeTracker({
  videoId,
  lessonId,
  minWatchPercentage = 85,
  onProgressUpdate,
}: YouTubeTrackerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<any>(null);
  const progressIdRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [watchPct, setWatchPct] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Inicializando reproductor...');

  // 1. Obtener o crear progreso en backend
  useEffect(() => {
    initLessonProgress();
  }, [lessonId]);

  const initLessonProgress = async () => {
    try {
      const res = await api(`/api/progress/lessons/${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        progressIdRef.current = data.id;
        setIsCompleted(data.isCompleted);
        const total = data.totalBlocks || 0;
        const watched = (data.watchedBlocks || []).length;
        const pct =
          data.currentWatchPercentage ??
          (total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 0);
        setWatchPct(pct);
      }
    } catch (err) {
      console.log('Error initializing lesson progress', err);
    }
  };

  // 2. Cargar YouTube IFrame Player API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    } else {
      createPlayer();
    }

    return () => {
      clearInterval(heartbeatIntervalRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const createPlayer = () => {
    if (!containerRef.current) return;

    if (playerRef.current && playerRef.current.destroy) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
      },
      events: {
        onReady: () => {
          setStatusMsg('Reproductor listo.');
        },
        onStateChange: (event: any) => {
          handlePlayerStateChange(event.data);
        },
      },
    });
  };

  // Manejar estados del reproductor de YouTube
  // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
  const handlePlayerStateChange = (playerState: number) => {
    if (playerState === 1) {
      setIsPlaying(true);
      startHeartbeat();
      setStatusMsg('Reproduciendo (Tracking activo)');
    } else {
      setIsPlaying(false);
      stopHeartbeat();
      setStatusMsg(playerState === 2 ? 'En pausa' : 'Detenido');
    }
  };

  // Iniciar temporizador de heartbeat (cada 5.5 segundos = respeta límite atómico del backend)
  const startHeartbeat = () => {
    stopHeartbeat();
    // Enviar primer latido inmediato
    sendHeartbeat();

    // Intervalo cada 5.5 segundos (piso anti-trampa de 5s en SQL)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 5500);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    setHeartbeatActive(false);
  };

  // Enviar latido al backend con bloque floor(currentTime / 10)
  const sendHeartbeat = async () => {
    const currentProgressId = progressIdRef.current;
    if (
      !currentProgressId ||
      !playerRef.current ||
      typeof playerRef.current.getCurrentTime !== 'function'
    ) {
      return;
    }

    const currentTime = playerRef.current.getCurrentTime() || 0;
    const currentPositionSeconds = Math.floor(currentTime);
    const blockIndex = Math.floor(currentPositionSeconds / 10);

    setHeartbeatActive(true);

    try {
      const res = await api('/api/progress/heartbeat', {
        method: 'POST',
        body: JSON.stringify({
          progressId: currentProgressId,
          blockIndex,
          currentPositionSeconds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.accepted) {
          setWatchPct(data.currentWatchPercentage);
          if (data.isCompleted) {
            setIsCompleted(true);
          }
          if (onProgressUpdate) {
            onProgressUpdate(data);
          }
        }
      }
    } catch (err) {
      console.log('Error sending heartbeat', err);
    } finally {
      setTimeout(() => setHeartbeatActive(false), 800);
    }
  };

  return (
    <div className="space-y-4">
      {/* Marco de video YouTube */}
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner relative">
        <div ref={containerRef} className="w-full h-full"></div>
      </div>

      {/* Barra de progreso de tracking en vivo */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Progreso lección:</span>
            <span
              className={`font-black px-2.5 py-0.5 rounded-lg border text-xs ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {watchPct}% visto
            </span>
          </div>

          <span className="text-slate-400">|</span>

          <span className="text-slate-500 font-medium">Meta: {minWatchPercentage}%</span>

          {isCompleted && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" /> Lección Aprobada
            </span>
          )}
        </div>

        {/* Indicador de Heartbeat en tiempo real */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">{statusMsg}</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
              isPlaying
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                heartbeatActive
                  ? 'bg-emerald-500 scale-125'
                  : isPlaying
                  ? 'bg-emerald-400'
                  : 'bg-slate-400'
              } transition-all`}
            ></span>
            {isPlaying ? 'Heartbeat Activo (10s)' : 'En Pausa'}
          </span>
        </div>
      </div>
    </div>
  );
}
