import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FormpackManifest } from '../formpacks/types';

interface FormpackCardProps {
  manifest: FormpackManifest;
}

function FormpackCard({ manifest }: FormpackCardProps) {
  const { t } = useTranslation();
  const namespace = `formpack:${manifest.id}`;
  const title = t(manifest.titleKey, {
    ns: namespace,
    defaultValue: manifest.titleKey,
  });
  const description = t(manifest.descriptionKey, {
    ns: namespace,
    defaultValue: manifest.descriptionKey,
  });

  return (
    <article key={manifest.id} className="formpack-card">
      <div>
        <h3>{title}</h3>
        <p className="formpack-card__description">{description}</p>
      </div>
      <Link
        className="formpack-card__link"
        to={`/formpacks/${manifest.id}`}
      >
        {t('formpackOpen')}
      </Link>
    </article>
  );
}

/**
 * ⚡ Bolt: Memoized FormpackCard component.
 * This prevents unnecessary re-renders when the parent component's state changes,
 * improving performance for large lists.
 */
const MemoizedFormpackCard = memo(FormpackCard);

export default MemoizedFormpackCard;
