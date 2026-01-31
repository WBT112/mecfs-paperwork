import LegalPage from './LegalPage';
import imprintContent from '../content/legal/imprint.md?raw';

export default function ImprintPage() {
  return <LegalPage content={imprintContent} />;
}
