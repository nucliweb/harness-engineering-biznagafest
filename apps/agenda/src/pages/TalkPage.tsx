import { catalog, findTalk, resolveTalk, talks } from '@agenda/core';
import { TalkDetails } from '@agenda/ui';
import { Link, useParams } from 'react-router';

export function TalkPage() {
  const { id = '' } = useParams();
  const talk = findTalk(talks, id);
  const view = talk && resolveTalk(catalog, talk);

  return (
    <>
      <p>
        <Link to="/">Back to schedule</Link>
      </p>
      {view ? <TalkDetails view={view} /> : <p>Talk not found.</p>}
    </>
  );
}
