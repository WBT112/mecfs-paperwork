import { Link } from 'react-router-dom';

type FormpackDetailHeaderProps = Readonly<{
  title: string;
  description: string;
  backToListLabel: string;
}>;

export default function FormpackDetailHeader({
  title,
  description,
  backToListLabel,
}: FormpackDetailHeaderProps) {
  return (
    <div className="app__card-header">
      <div>
        <h2>{title}</h2>
        <p className="app__subtitle">{description}</p>
      </div>
      <Link className="app__link" to="/formpacks">
        {backToListLabel}
      </Link>
    </div>
  );
}
