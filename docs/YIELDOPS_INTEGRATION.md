# YieldOps <-> Transvec Integration

This completes the digital thread in both directions:
- Transvec -> YieldOps: open a job-focused YieldOps URL from a shipment.
- YieldOps -> Transvec: open Transvec focused on a tracking id.

## 1) Create integration file in YieldOps

Create `apps/dashboard/src/components/YieldOps_Integration.tsx`:

```tsx
import { useEffect } from 'react';

const TRANSVEC_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRANSVEC_BASE_URL) ||
  'https://transvec.vercel.app';

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function normalizeStatus(status?: string) {
  if (!status) return 'IN_TRANSIT';
  return status.toUpperCase().replace(/\s+/g, '_');
}

export function useIncomingDeepLink(setSearchQuery: (value: string) => void) {
  useEffect(() => {
    const apply = () => {
      const params = new URLSearchParams(window.location.search);
      const trackingId =
        params.get('trackingId') ||
        params.get('trackingCode') ||
        params.get('track') ||
        params.get('q') ||
        '';
      if (!trackingId) return;
      setSearchQuery(trackingId);
    };

    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [setSearchQuery]);
}

export function TrackShipmentButton({
  trackingId,
  status,
  className = '',
}: {
  trackingId: string;
  status?: string;
  className?: string;
}) {
  const params = new URLSearchParams({
    trackingId,
    status: normalizeStatus(status),
    source: 'yieldops',
  });
  const href = `${stripTrailingSlash(TRANSVEC_BASE_URL)}/?${params.toString()}`;

  return (
    <button
      type="button"
      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
      className={className || 'mt-3 w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-black/5'}
    >
      Track Asset
    </button>
  );
}
```

## 2) Receiver wiring in YieldOps app shell

Edit `apps/dashboard/src/App.tsx`:

```tsx
import { useIncomingDeepLink } from './components/YieldOps_Integration';
```

Inside your app component, where your main search state is defined:

```tsx
const [searchQuery, setSearchQuery] = useState('');
useIncomingDeepLink(setSearchQuery);
```

## 3) Sender wiring in YieldOps job cards

Edit `apps/dashboard/src/components/ui/JobCard.tsx` (or wherever each job card is rendered):

```tsx
import { TrackShipmentButton } from '../YieldOps_Integration';
```

Inside each card:

```tsx
<TrackShipmentButton
  trackingId={`TRK-${job.id.substring(0, 8)}`}
  status={job.status}
/>
```

## 4) Transvec environment variable

In Transvec, configure the target YieldOps URL:

```bash
VITE_YIELDOPS_BASE_URL=https://your-yieldops-host.example
```

Transvec already sends:
- `trackingId`
- `jobId` (if available)
- `status`
- `source=transvec`

## 5) Verify

From Transvec:
- Open a shipment.
- Click `OPEN YIELDOPS`.
- YieldOps should open with query params and auto-search.

From YieldOps:
- Click `Track Asset` on a job.
- Transvec should open focused on the matching shipment.

