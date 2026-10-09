import { CinematicLogoLoader } from '@/components/loading-animation/cinematic-logo-loader'

export default function Loading() {
  return (
    <>
      <CinematicLogoLoader
        label="Loading"
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
        @media (prefers-reduced-motion: reduce) {
          .workspace-route-loader.prom-cine-enter {
            animation: none;
          }
        }
      `}</style>
    </>
  )
}
