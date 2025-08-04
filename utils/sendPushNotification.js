import fetch from 'node-fetch';

export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    }),
  });
} 