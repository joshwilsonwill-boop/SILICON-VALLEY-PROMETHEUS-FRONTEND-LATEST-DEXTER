'use client'

import * as React from 'react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import type { CinematicTemplateAsset, ExplainerCue } from '@/lib/types'

type TemplatePayload = {
  template: CinematicTemplateAsset
  html: string
}

export function CinematicTemplateHost({
  cue,
  className,
}: {
  cue: ExplainerCue
  className?: string
}) {
  const [payload, setPayload] = React.useState<TemplatePayload | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()

    void fetch(`/api/cinematic/template?id=${encodeURIComponent(cue.templateId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load cinematic template runtime.')
        }
        return (await response.json()) as TemplatePayload
      })
      .then((nextPayload) => {
        setPayload(nextPayload)
      })
      .catch((error) => {
        if ((error as Error).name === 'AbortError') return
        console.warn('Failed to hydrate cinematic template host.', error)
        setPayload(null)
      })

    return () => controller.abort()
  }, [cue.templateId])

  const srcDoc = React.useMemo(() => {
    if (!payload?.html) return ''
    return injectRuntimeData({
      html: payload.html,
      cue,
      template: payload.template,
    })
  }, [cue, payload])

  return (
    <div className={cn('h-full w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/35', className)}>
      {srcDoc ? (
        <iframe
          key={cue.id}
          title={cue.title ?? cue.templateId}
          srcDoc={srcDoc}
          className="h-full w-full border-0 bg-transparent"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_58%)] text-center">
          <div className="flex flex-col items-center gap-3">
            <InlineLoadingAnimation size={72} label="Loading explainer template" />
            <p className="text-xs text-white/52">Preparing the selected template.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function injectRuntimeData({
  html,
  cue,
  template,
}: {
  html: string
  cue: ExplainerCue
  template: CinematicTemplateAsset
}) {
  const runtimeData = JSON.stringify({
    textSlots: cue.textSlots,
    textSlotOrder: template.textSlotNames,
    imageSlots: cue.imageSlots ?? {},
    imageSlotOrder: template.imageSlotNames,
  })

  const runtimeScript = `
<script>
window.__PROMETHEUS_TEMPLATE_DATA__ = ${runtimeData};
(function () {
  const payload = window.__PROMETHEUS_TEMPLATE_DATA__ || {};
  const svgNs = 'http://www.w3.org/2000/svg';
  const xlinkNs = 'http://www.w3.org/1999/xlink';

  function setText(slotId, value) {
    if (typeof value !== 'string') return;
    const element = document.getElementById(slotId);
    if (!element) return;

    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    const lines = value.split(/\\n+/).filter(Boolean);
    const x = element.getAttribute('x') || '0';

    lines.forEach((line, index) => {
      if (index === 0) {
        element.appendChild(document.createTextNode(line));
        return;
      }

      const tspan = document.createElementNS(svgNs, 'tspan');
      tspan.setAttribute('x', x);
      tspan.setAttribute('dy', '1.18em');
      tspan.textContent = line;
      element.appendChild(tspan);
    });
  }

  Object.entries(payload.textSlots || {}).forEach(([slotId, value]) => {
    setText(slotId, value);
  });

  Object.entries(payload.imageSlots || {}).forEach(([slotId, value]) => {
    if (typeof value !== 'string') return;
    const element = document.getElementById(slotId);
    if (!element) return;
    element.setAttribute('href', value);
    try {
      element.setAttributeNS(xlinkNs, 'href', value);
    } catch (error) {
      // Ignore xlink assignment failures in newer SVG runtimes.
    }
  });

  if (typeof window.updateAsset === 'function') {
    try {
      const orderedTextArgs = (payload.textSlotOrder || []).map((slotId) => payload.textSlots?.[slotId] || '');
      window.updateAsset.apply(window, orderedTextArgs);
    } catch (error) {
      console.warn('Template updateAsset hook failed.', error);
    }
  }

  if (typeof window.updateImages === 'function') {
    try {
      const slotMap = {};
      (payload.imageSlotOrder || []).forEach((slotId, index) => {
        const value = payload.imageSlots?.[slotId];
        if (typeof value === 'string' && value.length > 0) {
          slotMap['slot' + (index + 1)] = value;
        }
      });
      window.updateImages(slotMap);
    } catch (error) {
      console.warn('Template updateImages hook failed.', error);
    }
  }

  if (typeof window.runScene === 'function') {
    try {
      window.runScene();
    } catch (error) {
      console.warn('Template runScene hook failed.', error);
    }
  }
})();
</script>`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${runtimeScript}</body>`)
  }

  return `${html}${runtimeScript}`
}
