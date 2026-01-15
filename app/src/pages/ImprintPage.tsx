import imprintContent from '../content/legal/imprint.md?raw';
import LegalPage from './LegalPage';

export default function ImprintPage() {
  return <LegalPage content={imprintContent} />;
}
