'use client';
import { useId, useRef, useState } from 'react';
import { ExternalLink, Play, X } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import type { LearningVideo as Video } from '@/lib/domain/learning-resources';

export function LearningVideo({
  video,
  label,
  guide,
  searchUrl,
}: {
  video?: Video;
  label: string;
  guide?: string;
  searchUrl?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);
  const { t } = useLanguage();
  const titleId = useId();
  return (
    <>
      <button className="button button-secondary" onClick={() => dialog.current?.showModal()}>
        <Play size={16} />
        {label}
      </button>
      <dialog
        ref={dialog}
        className="learning-dialog"
        aria-labelledby={titleId}
        onClose={() => setLoaded(false)}
      >
        <div className="row-between">
          <h2 id={titleId}>{t('Learn at your own pace', 'Aprende a tu ritmo')}</h2>
          <button
            className="icon-button"
            aria-label={t('Close video', 'Cerrar video')}
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        {video ? (
          <>
            <p lang="en">
              {video.title} · {video.publisher}
            </p>
            <p>
              {t(
                'English video. Captions and translation depend on YouTube. Older interfaces may look different.',
                'Video en inglés. Los subtítulos y su traducción dependen de YouTube. Las interfaces antiguas pueden verse diferentes.',
              )}
            </p>
            {loaded ? (
              <iframe
                title={video.title}
                src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div className="video-consent">
                <Play size={36} />
                <p>
                  {t(
                    'Only load YouTube if you want to watch. Loading shares connection information with YouTube.',
                    'Carga YouTube solo si quieres verlo. Al cargar se comparte información de conexión con YouTube.',
                  )}
                </p>
                <button className="button" onClick={() => setLoaded(true)}>
                  {t('Load optional video', 'Cargar video opcional')}
                </button>
              </div>
            )}
            <a
              className="quiet-link"
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('Watch on YouTube', 'Ver en YouTube')}
              <ExternalLink size={14} />
            </a>
            <p className="small muted">
              {t('Resource checked', 'Recurso revisado')}: {video.checkedAt}
            </p>
          </>
        ) : (
          <>
            <p>
              {t(
                'We haven’t reviewed a tutorial video for this tool yet. You can use its official guide instead.',
                'Todavía no hemos revisado un tutorial en video de esta herramienta. Puedes usar su guía oficial.',
              )}
            </p>
            {guide && (
              <a className="button" href={guide} target="_blank" rel="noopener noreferrer">
                {t('Open official guide', 'Abrir guía oficial')}
                <ExternalLink size={16} />
              </a>
            )}
            {searchUrl && (
              <>
                <a
                  className="quiet-link"
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Find tutorial videos on YouTube', 'Buscar tutoriales en YouTube')}
                  <ExternalLink size={14} />
                </a>
                <p className="small muted">
                  {t(
                    'Search results are not reviewed by us. Prefer videos from the tool’s official channel.',
                    'No revisamos los resultados de búsqueda. Prefiere videos del canal oficial de la herramienta.',
                  )}
                </p>
              </>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
