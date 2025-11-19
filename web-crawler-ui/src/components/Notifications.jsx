// src/components/Notifications.jsx
export const Notifications = ({ notification }) => {
  if (!notification.message) return null;

  return (
    <div className={`alert alert-${notification.type}`}>
      <span style={{ fontSize: '1.25rem' }}>
        {notification.type === 'success' ? '✓' : '⚠'}
      </span>
      <span>{notification.message}</span>
    </div>
  );
};
