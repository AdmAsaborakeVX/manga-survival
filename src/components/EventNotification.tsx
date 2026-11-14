import './EventNotification.css';
import type { GameEvent } from '@/types';
import { useEffect, useState } from 'react';

interface EventNotificationProps {
  events: Array<{ week: number; event: GameEvent }>;
}

export default function EventNotification({ events }: EventNotificationProps) {
  const [displayedEvent, setDisplayedEvent] = useState<{ week: number; event: GameEvent } | null>(
    null
  );

  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayedEvent(latestEvent);

      const timer = setTimeout(() => {
        setDisplayedEvent(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [events]);

  if (!displayedEvent) {
    return null;
  }

  const { event } = displayedEvent;
  const typeClass = `event-${event.type}`;

  return (
    <div className={`event-notification ${typeClass}`}>
      <div className="event-icon">
        {event.type === 'positive' && '✓'}
        {event.type === 'negative' && '!'}
        {event.type === 'neutral' && 'i'}
      </div>
      <div className="event-content">
        <div className="event-title">{event.title}</div>
        <div className="event-description">{event.description}</div>
      </div>
    </div>
  );
}
