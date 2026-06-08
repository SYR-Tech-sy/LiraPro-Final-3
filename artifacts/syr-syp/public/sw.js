// ── IndexedDB helper ─────────────────────────────────────────────────────────

function openSyncDb() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open('lirapro-sw-sync', 1);
    req.onupgradeneeded = function (e) {
      e.target.result.createObjectStore('pending-reads', { keyPath: 'key' });
    };
    req.onsuccess = function (e) { resolve(e.target.result); };
    req.onerror = function () { reject(req.error); };
  });
}

/**
 * Enqueue a notification read receipt in IndexedDB for background sync.
 * Called when a push arrives with a notifId so we can mark it 'delivered'.
 */
async function enqueueRead(notifId, walletId) {
  if (!notifId || !walletId) return;
  try {
    var db = await openSyncDb();
    var key = String(notifId) + '-' + String(walletId);
    var tx = db.transaction('pending-reads', 'readwrite');
    tx.objectStore('pending-reads').put({ key: key, notifId: notifId, walletId: walletId });
    await new Promise(function (r) { tx.oncomplete = r; tx.onerror = r; });
    db.close();
    // Request background sync to flush receipts immediately
    if ('sync' in self.registration) {
      await self.registration.sync.register('lirapro-notification-reads').catch(function () {});
    }
  } catch {}
}

// ── Push notification handler ─────────────────────────────────────────────────

self.addEventListener('push', function (event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || 'LiraPro';
  var options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    dir: 'rtl',
    lang: 'ar',
    tag: 'lirapro-broadcast',
    renotify: true,
    data: {
      url: data.url || '/app/home',
      notifId: data.notifId || null,
      walletId: data.walletId || null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(function () {
      // Enqueue a delivered receipt if we have the required IDs
      return enqueueRead(data.notifId, data.walletId);
    })
  );
});

// ── Notification click — navigate to target URL ───────────────────────────────

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url || '/app/home';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Notification close — user dismissed without clicking ─────────────────────
// Post a message to open app windows so they can call the view API with their auth token.

self.addEventListener('notificationclose', function (event) {
  var notifData = event.notification.data || {};
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function (clientList) {
      clientList.forEach(function (client) {
        client.postMessage({
          type: 'NOTIFICATION_DISMISSED',
          notifId: notifData.notifId || null,
          walletId: notifData.walletId || null,
        });
      });
    })
  );
});

// ── Background sync — flush queued read receipts when connectivity restores ───

self.addEventListener('sync', function (event) {
  if (event.tag === 'lirapro-notification-reads') {
    event.waitUntil(flushNotificationReads());
  }
});

async function flushNotificationReads() {
  var db;
  try { db = await openSyncDb(); } catch { return; }

  var items = await new Promise(function (resolve) {
    var tx = db.transaction('pending-reads', 'readonly');
    var req = tx.objectStore('pending-reads').getAll();
    req.onsuccess = function () { resolve(req.result || []); };
    req.onerror = function () { resolve([]); };
  });

  var flushed = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    try {
      var resp = await fetch('/api/notifications/' + item.notifId + '/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: item.walletId }),
      });
      if (resp.ok) flushed.push(item.key);
    } catch { /* keep for next sync attempt */ }
  }

  if (flushed.length > 0) {
    var tx2 = db.transaction('pending-reads', 'readwrite');
    var store = tx2.objectStore('pending-reads');
    flushed.forEach(function (key) { store.delete(key); });
    await new Promise(function (r) { tx2.oncomplete = r; tx2.onerror = r; });
  }
  db.close();
}
