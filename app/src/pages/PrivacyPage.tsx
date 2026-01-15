import privacyContent from '../content/legal/privacy.md?raw';
import LegalPage from './LegalPage';

export default function PrivacyPage() {
  return <LegalPage content={privacyContent} />;
}
