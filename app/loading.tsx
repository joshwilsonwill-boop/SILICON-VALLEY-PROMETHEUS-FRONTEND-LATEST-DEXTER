import { CinematicLogoLoader } from '@/components/loading-animation/cinematic-logo-loader'

export default function Loading() {
  return (
    <>
      <CinematicLogoLoader
        caption="Opening your workspace…"
        className="workspace-route-loader"
      />
      <style>{`
        .workspace-route-loader.prom-cine-overlay {
          background: #050507;
        }
        .workspace-route-loader .prom-cine-backdrop {
          display: none;
        }
        .workspace-route-loader.prom-cine-enter {
          animation-duration: 500ms;
        }
        .workspace-route-loader .prom-cine-caption {
          color: rgba(255, 255, 255, 0.86);
          letter-spacing: 0.16em;
          white-space: nowrap;
        }
        @media (prefers-reduced-motion: reduce) {
          .workspace-route-loader.prom-cine-enter {
            animation: none;
          }
        }
      `}</style>
    </>
  )
}
