const CACHE_NAME = 'classic-fc-games-v13';
const urlsToCache = [
    './',
    './index.html',
    './css/mobile.css',
    './js/jquery-1.4.2.min.js',
    './js/nes.js',
    './js/utils.js',
    './js/cpu.js',
    './js/keyboard.js',
    './js/mappers.js',
    './js/papu.js',
    './js/ppu.js',
    './js/rom.js',
    './js/ui.js',
    './js/mobile-touch.js',
    './js/mobile-app.js',
    './js/online-multiplayer.js',
    './js/supabase-multiplayer.js',
    './js/dynamicaudio-min.js'
];

// 安装
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// 激活
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

// 拦截请求
self.addEventListener('fetch', event => {
    // 忽略非http请求
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
    );
});




