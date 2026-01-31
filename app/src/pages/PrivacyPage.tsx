import LegalPage from './LegalPage';
import privacyContent from '../content/legal/privacy.md?raw';

export default function PrivacyPage() {
  return <LegalPage content={privacyContent} />;
}
